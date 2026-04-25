import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import League from "../models/league.model.js";
import Season from "../models/seasons.model.js";
import StudioSeason from "../models/studioSeason.model.js";
import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog.model.js";

// انشاء الدورى
export const createLeague = catchAsync(async(req , res , next) => {
    const {name , isPublic} = req.body;
    const userId = req.user._id;
    
    if(!name) return next(new AppError("Please provide a name for the league" , 400));

    // هنجيب السيزون الحالى
    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if(!currentSeason){
        return next(new AppError("There is no active season at the moment. Please wait for the next season to start." , 404));
    }

    // نشوف اليوزر عنده محفظة متسجلة للموسم دا
    const hasStudio = await StudioSeason.exists({userId , seasonId: currentSeason._id})

    if (!hasStudio) {
        return next(new AppError("You must initialize your studio for the current season before creating a league.", 403));
    }

    // هنتاكد ان اليوزر معندوش دوريات تانية اخره 3 دوريات بس
    const userOwnedLeaguesCount = await League.countDocuments({
        ownerId: userId,
        seasonId: currentSeason._id
    });

    if(userOwnedLeaguesCount >= 3){
        return next(new AppError("You have reached the maximum limit. You can only own up to 3 leagues" , 403));
    }

    // لو تمام هننشئ الدورى
    const newLeague = await League.create({
        name: name,
        ownerId: userId,
        isPublic: isPublic,
        seasonId: currentSeason._id
    });

    await newLeague.save();

    res.status(201).json({
        status: "success",
        message: 'League created successfully! Invite your friends using the code.',
        data: {
            league: {
                _id: newLeague._id,
                name: newLeague.name,
                inviteCode: newLeague.inviteCode,
                ownerId: newLeague.ownerId,
                isPublic: newLeague.isPublic,
                memberCount: newLeague.members.length,
                createdAt: newLeague.createdAt
            }
        }
    })
})

// Join
export const joinLeague = catchAsync(async(req , res , next) => {
    const {inviteCode} = req.body;
    const userId = req.user._id;
    
    if(!inviteCode) {
        return next(new AppError("Please provide an invite code" , 400));
    }

    const formattedInviteCode = inviteCode.toUpperCase().trim();

    // نتاكد من ان الدورى لسه موجود
    const targetLeague = await League.findOne({inviteCode: formattedInviteCode});

    if(!targetLeague){
        return next(new AppError("Invalid invite code. Please check and try again" , 404));
    }

    // نشوف هل الموسم اللى فيه الدورى دا لسه شغال ولا خلص خلاص
    if(['POST_SEASON' , 'CLOSED'].includes(targetLeague.seasonId.status)){
        return next(new AppError("You cannot join this league because its season has already ended.", 400));
    }

    const hasStudio = await StudioSeason.exists({userId , seasonId: targetLeague.seasonId});

    if(!hasStudio){
        return next(new AppError("You must initialize your studio for this season before joining.", 403));
    }

    const joinedLeague = await League.findOneAndUpdate(
        {
            _id: targetLeague._id,
            inviteCode: formattedInviteCode,
            members: {$ne: userId},
            'members.99': {$exists: false}
        },
        {
            $addToSet: {members: userId}
        },
        {
            returnDocument: 'after',
            runValidators: true
        }
    );

    if(joinedLeague){
        return res.status(200).json({
            status: "success",
            message: `Successfully joined league ${joinedLeague.name}`,
            data: {
                league: {
                    _id: joinedLeague._id,
                    name: joinedLeague.name,
                    memberCount: joinedLeague.members.length,
                }
            }
        })
    }

    // لو الموضوع متمش نشوف ليه متمش
    if(targetLeague.members.includes(userId)){
        return next(new AppError("You are already a member of this league" , 400));
    }

    if(targetLeague.members.length >= 100){
        return next(new AppError("This league has reached its maximum capacity of 100 members." , 400));
    }

    return next(new AppError("Could not join the league at this time." , 500))
})

export const joinPublicLeague = catchAsync(async (req , res , next) => {
    const leagueId = req.params.leagueId;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(leagueId))  {
        return next(new AppError("Invalid league id." , 400));
    }

    const targetLeague = await League.findById(leagueId).populate("seasonId");
    // بنعمل هنا اشتيك على شوية حالات ممكن تقابلنا زى ان الدورى مش موجود او اليوزر فى الدورى اصلا او الورى مليان او الدورى برايفت
    if(!targetLeague){
        return next(new AppError("League not found." , 404));
    }

    if(!targetLeague.isPublic){
        return next(new AppError('This league is private. You need an invite code to join.', 403));
    }

    if(['POST_SEASON' , 'CLOSED'].includes(targetLeague.seasonId.status)){
        return next(new AppError('This league is closed. You cannot join.', 403));
    }

    if(targetLeague.members.includes(userId)){
        return next(new AppError('You are already a member of this league.', 400));
    }

    if(targetLeague.members.length >= 100){
        return next(new AppError('This league has reached its maximum capacity of 100 members.', 403));
    }

    // هنشوف لو عدا من كل الحالات دى هل معاه محفظة ومسجل فى السيزون دا
    const hasStudio = await StudioSeason.exists({
        userId: userId,
        seasonId: targetLeague.seasonId._id
    })

    if(!hasStudio) {
        return next(new AppError('You must initialize your studio for this season before joining a league.', 403));
    }

    // لو تمام ندخله الدورى
    const joinedLeague = await League.findOneAndUpdate(
        {
            _id: leagueId,
            isPublic: true,
            members: {$ne: userId},
            "members.99": {$exists: false}
        },
        {
            $addToSet: {members: userId}
        },
        {
            returnDocument: "after",
            runValidators: true
        }
    )

    if(joinedLeague){
        return res.status(200).json({
            status: 'success',
            message: `Successfully joined ${joinedLeague.name}!`,
            data: {
                league: {
                    _id: joinedLeague._id,
                    name: joinedLeague.name,
                    memberCount: joinedLeague.members.length
                }
            }
        });
    }

    return next(new AppError('Could not join the league at this time. It may have just reached full capacity.', 409)); 
})

// دى الفانكشن المسئولة انها تجيب الدوريات العامة وتعرضها لليوزرز
export const getPublicLeagues = catchAsync(async(req , res , next) => {
    // هنجيب الايدى بتاع اليوزر 
    const userId = req.user._id;

    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if (!currentSeason) return res.status(200).json({ status: "success", data: { leagues: [] } });

    // هنجهز ال pagination عشان منبعتش كل الداتا مرة واحدة
    const page = parseInt(req.query.page , 10) || 1;
    const limit = parseInt(req.query.limit , 10) || 12;
    const skip = (page - 1) * limit;

    // هنجمع ال leagues اللى هنعرضها لليوزرز
    const publicLeagues = await League.aggregate([
        {
            $match: {
                isPublic: true,
                seasonId: currentSeason._id,
                members: {$ne: userId},
                'members.99': {$exists: false}
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerId",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                ownerName: "$owner.studioName",
                membersCount: {$size: "$members"},
                createdAt: 1
            }
        },
        {$sort: {membersCount: -1 , createdAt: -1}},
        {$skip: skip},
        {$limit: limit}
    ])

    const totalAvailableLeagues = await League.countDocuments({
        isPublic: true,
        members: {$ne: userId},
        "members.99": {$exists: false}
    });

    const totalPages = Math.ceil(totalAvailableLeagues / limit);

    res.status(200).json({
        status: "success",
        results: publicLeagues.length,
        pagination: {
            currentPage: page,
            totalPages,
            totalAvailableLeagues,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        },
        data: {
            leagues: publicLeagues
        }
    })
})

// الفانكشن المسئولة تجيب الدوريات بتاعت اليوزر
export const getMyLeagues = catchAsync(async (req , res , next) => {
    const userId = req.user._id;

    const currentSeason = await Season.findOne({
        status: {$in: ["PRE_SEASON" , "ACTIVE"]}
    })

    if(!currentSeason) return res.status(200).json({ status: "success", data: { leagues: [] } });

    const myLeagues = await League.aggregate([
        {
            $match: {
                members: userId,
                seasonId: currentSeason._id
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerId",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        {
            $unwind: "$ownerInfo"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                inviteCode: 1,
                isPublic: 1,
                memberCount: {$size: "$members"},
                ownerName: "$ownerInfo.studioName",
                role: {
                    $cond: {
                        if: {$eq: ["$ownerId" , userId]},
                        then: "OWNER",
                        else: "MEMBER"
                    }
                },
                createdAt: 1
            }
        },
        {$sort: {role: -1 , createdAt: -1}}
    ]);

    res.status(200).json({
            status: 'success',
            results: myLeagues.length,
            data: {
                leagues: myLeagues
            }
    });
})

// هنا هنجيب معلومات وتفاصيل الدورى عن طريق الايدى
export const getLeagueById = catchAsync(async (req , res , next) => {
    const leagueId = req.params.leagueId;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(leagueId)){
        return next(new AppError("Invalid league Id" , 400));
    }

    const leagueDetails = await League.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(leagueId),
                members: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerId",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: '$owner'
        },
        {
            $lookup: {
                from: "seasons",
                localField: "seasonId",
                foreignField: "_id",
                as: "season"
            }
        },
        {
            $unwind: '$season'
        },
        {
            $project: {
                _id: 1,
                name: 1,
                inviteCode: 1,
                isPublic: 1,
                memberCount: {$size: '$members'},
                ownerName: '$owner.studioName',
                seasonInfo: {
                    id: '$season._id',
                    name: '$season.name',
                    status: '$season.status'
                },
                role: {
                    $cond: {
                        if: {$eq: ['$ownerId' , new mongoose.Types.ObjectId(userId)]},
                        then: "OWNER",
                        else: "MEMBER"
                    }
                },
                createdAt: 1
            }
        }
    ]);

    if(!leagueDetails || leagueDetails.length === 0){
        return next(new AppError('League not found or you do not have permission to view it.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            league: leagueDetails[0]
        }
    });
})

// هنا هنجيب الترتيب بتاع اليوزر فى الدورى اللى هما فيه علشان نعرضهم فى الفرونت مترتبين
export const getLeagueLeaderboard = catchAsync(async (req , res , next) => { 
    const leagueId = req.params.leagueId;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(leagueId)){
        return next(new AppError("Invalid league id" , 400));
    }

    const targetLeague = await League.findById(leagueId);

    if(!targetLeague){
        return next(new AppError("League not found" , 404));
    }

    if(!targetLeague.members.includes(userId)){
        return next(new AppError('Access denied. You are not a member of this league.', 403));
    }

    const leaderboard = await StudioSeason.aggregate([
        {
            $match: {
                seasonId: targetLeague.seasonId,
                userId: {$in: targetLeague.members}
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $setWindowFields: {
                sortBy: {netWorth: -1},
                output: {
                    rank: {
                        $documentNumber: {}
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                userId: "$userId",
                rank: 1,
                studioName: "$user.studioName",
                netWorthInDollars: {$divide: ["$netWorth" , 100]},
                cashBalanceInDollars: {$divide: ["$cashBalance" , 100]},
                isMe: {$eq: ['$userId' , new mongoose.Types.ObjectId(userId)]}
            }
        }
    ]);

    const myRank = leaderboard.find(player => player.isMe === true) || null;

    res.status(200).json({
        status: 'success',
        data: {
            leagueDetails: {
                id: targetLeague._id,
                name: targetLeague.name,
                totalMembers: targetLeague.members.length
            },
            myStats: myRank,
            leaderboard 
        }
    });
})

export const getLeagueActivityFeed = catchAsync(async (req , res , next) => {
    const leagueId = req.params.leagueId;
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const targetLeague = await League.findById(leagueId);

    if(!targetLeague){
        return next(new AppError("League Not Found" , 404));
    }

    if(!targetLeague.members.includes(userId)){
        return next(new AppError('Access denied. You are not a member of this league.', 403));
    }

    const feed = await ActivityLog.find({
        seasonId: targetLeague.seasonId,
        userId: {$in: targetLeague.members}
    }).sort({createdAt: -1}).skip(skip).limit(limit).select('-__v -updatedAt');

    res.status(200).json({
        status: 'success',
        results: feed.length,
        pagination: {
            currentPage: page,
            limit: limit
        },
        data: {
            feed: feed.map(log => ({
                id: log._id,
                type: log.type,
                timestamp: log.createdAt,
                details: {
                    ...log.data,
                    purchasePriceInDollars: log.data.purchasePrice ? log.data.purchasePrice / 100 : undefined
                }
            }))
        }
    });
})

// الفانكشن المسئولة للادمن لتحديث الدورى
export const updateLeagueSettings = catchAsync(async (req , res , next) => {
    const {leagueId} = req.params;
    const {name , isPublic} = req.body;
    const userId = req.user._id;

    // نتاكد ان الدورى موجود
    const league = await League.findById(leagueId);

    if(!league){
        return next(new AppError("League not found" , 404));
    }

    // نتأكد ان اليوزر هو صاحب الدورى
    if(league.ownerId.toString() !== userId.toString()){
        return next(new AppError("Access denied. Only the league owner can update the settings." , 403));
    }

    if(name) league.name = name;
    if(isPublic !== undefined) league.isPublic = isPublic;

    await league.save();

    res.status(200).json({
        status: "success",
        message: "League settings updated successfully",
        data: {
            league
        }
    });
})

// الفانكشن اللى هيستخدمها الادمن علشان لو عايز يطرد حد 
export const kickPlayerFromLeague = catchAsync(async (req , res , next) => {
    const { leagueId , playerId } = req.params;
    const adminId = req.user._id;

    if(playerId.toString() === adminId.toString()){
        return next(new AppError("You cannot kick yourself from the league." , 400));
    }

    const updatedLeague = await League.findByIdAndUpdate(
        {
            _id: leagueId,
            owenerId: adminId
        },
        {
            $pull: {
                members: playerId
            }
        },
        {
            returnDocument: "after"
        }
    );

    if(!updatedLeague){
        return next(new AppError("League not found or you do not have permission to kick members." , 404));
    };

    res.status(200).json({
        status: "success",
        message: "The Player successfully kicked from the league.",
        membersCount: updatedLeague.members.length
    })
})

// لو اليوزر هو اللى عايز يخرج من الدورى
export const leaveLeague = catchAsync(async (req , res , next) => {
    const {leagueId} = req.params;
    const userId = req.user._id;

    const league = await League.findById(leagueId);

    if(!league){
        return next(new AppError("League is not found with this id" , 404))
    };

    if(league.ownerId.toString() === userId.toString()){
        return next(new AppError("You can't leave your own league" , 400))
    }

    if(!league.members.includes(userId)){
        return next(new AppError("You are not a member of this league" , 400))
    }

    const updatedLeague = await League.findByIdAndUpdate(leagueId , {
        $pull: {
            members: userId
        }
    } , {returnDocument: 'after'});

    res.status(200).json({
        status: "success",
        message: "You leaved league succesfully",
        membersCount: updatedLeague.members.length
    })
})