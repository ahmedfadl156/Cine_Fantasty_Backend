import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { createSendToken } from "./auth.controller.js";

const filterObj = (obj , ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
}

// الفانكشن المسئولة عن تحديث بيانات اليوزر الاسم والايميل
export const updateMe = catchAsync(async (req , res , next) => {
    if(req.body.password){
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword' , 400))
    }

    const filteredBody = filterObj(req.body , 'studioName' , 'email');

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        filteredBody,
        {returnDocument: 'after' , runValidators: true}
    );

    res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: {
            user: updatedUser
        }
    })
})

// تحديث الباسورد
export const updatePassword = catchAsync(async (req , res , next) => {
    // هنجيب الباسورد بتاع اليوزر اللى عايز يغير
    const user = await User.findById(req.user._id).select('+password');

    // نتأكد ان الباسورد اللى هو دخله صح
    const isCorrectPassword = user.correctPassword(req.body.currentPassword , user.password);

    if(!isCorrectPassword){
        return next(new AppError('The current password you entered is incorrect.' , 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    createSendToken(user , 200 , res);
})