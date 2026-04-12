import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import League from "../models/league.model.js";

// انشاء الدورى
export const createLeague = catchAsync(async(req , res , next) => {
    const {name , isPublic} = req.body;
    const userId = req.user._id;
    
    if(!name) return next(new AppError("Please provide a name for the league" , 400));

    // هنتاكد ان اليوزر معندوش دوريات تانية اخره 3 دوريات بس
    const userOwnedLeaguesCount = await League.countDocuments({ownerId: userId});

    if(userOwnedLeaguesCount >= 3){
        return next(new AppError("You have reached the maximum limit. You can only own up to 3 leagues" , 403));
    }

    // لو تمام هننشئ الدورى
    const newLeague = await League.create({
        name: name,
        ownerId: userId,
        isPublic: isPublic
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

    const joinedLeague = await League.findOneAndUpdate(
        {
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
    const leagueCheck = await League.findOne({inviteCode: formattedInviteCode});

    if(!leagueCheck){
        return next(new AppError("Invalid invite code. Please check and try again" , 404));
    }

    if(leagueCheck.members.includes(userId)){
        return next(new AppError("You are already a member of this league" , 400));
    }

    if(leagueCheck.members.length >= 100){
        return next(new AppError("This league has reached its maximum capacity of 100 members." , 400));
    }

    return next(new AppError("Could not join the league at this time." , 500))
})

