import dotenv from "dotenv";
dotenv.config({path: "config/.env"})
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// الفانكشن المسئولة اننا نتحقق من التوكن اللي جاي من جوجل ونرجع البيانات بتاعته
export const verifyGoogleToken = async (accessToken) => {
    const ticket = await googleClient.verifyIdToken({
        idToken: accessToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    return ticket.getPayload();
}

// الفانكشن اللى هتحقق من فيسبوك
export const verifyFacebookToken = async (accessToken) => {
    const url = `https://graph.facebook.com/me?fields=name,email,picture.type(large)&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || "فشل التحقق من توكن فيسبوك");
    }
    
    return data;
}


export const handleSocialLogin = async (providerData , providerName) => {
    const {email , studioName , id , picture} = providerData;

    if(!email){
        throw new Error("We couldn't retrieve your email from the social provider. Please Login with another method.");
    }

    const query = providerName === "google" ? { googleId: id } : { facebookId: id };
    let user = await User.findOne(query);

    if(user){
        return user;
    }

    user = await User.findOne({email});

    if(user){
        if(providerName === "google") user.googleId = id;
        if(providerName === "facebook") user.facebookId = id;

        if(user.avatar === "/User_Logo.png" && picture){
            user.avatar = picture;
        }
        await user.save();
        return user;
    }

    const newUser = await User.create({
        studioName,
        email,
        password: undefined,
        googleId: providerName === "google" ? id : undefined,
        facebookId: providerName === "facebook" ? id : undefined,
        avatar: picture || "/User_Logo.png"
    })

    return newUser;
}