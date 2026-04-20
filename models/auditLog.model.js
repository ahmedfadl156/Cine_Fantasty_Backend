import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "An audit log must have an adminId"]
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "An audit log must have a targetUserId"]
    },
    actionType: {
        type: String,
        enum: ['COMPENSATE_CASH', 'DEDUCT_CASH', 'STATUS_CHANGE'],
        required: [true, "An audit log must have an actionType"]
    },
    amountInCents: {
        type: Number,
        default: 0
    },
    reason: {
        type: String,
        required: [true, "An audit log must have a reason"]
    }
})

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;