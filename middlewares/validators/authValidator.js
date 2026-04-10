import { body, validationResult } from "express-validator";
import AppError from "../../utils/appError.js";

export const signupValidator = [
    body('studioName')
    .trim()
    .notEmpty().withMessage('Studio Name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Studio Name must be between 3 and 50 characters')
    .escape(),

    body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

    body('password')
    .isLength({min: 8}).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    (req , res , next) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return next(new AppError(errors.array()[0].msg , 400))
        }
        next();
    }
]