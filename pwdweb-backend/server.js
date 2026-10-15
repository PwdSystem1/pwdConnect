import alertEmailQueue from './utils/alertEmailQueue.js';
import staffMembershipRoutes from './routes/staffMembershipRoutes.js';
import requestTrackingRoutes from './routes/requestTrackingRoutes.js';
import workflowNotifications from './utils/workflowNotifications.js';
import resetGate from './middleware/resetGate.js';
import resetGeneration from './utils/resetGeneration.js';
import systemSettingsRoutes from './routes/systemSettingsRoutes.js';
import systemAudit from './middleware/systemAudit.js';
import auditService from './utils/systemAudit.js';
import logoutRoutes from './routes/logoutRoutes.js';
import adminAuditRoutes from './routes/adminAuditRoutes.js';
import speechRoutes from './routes/speechRoutes.js';
import adminAnnouncementRoutes from './routes/adminAnnouncementRoutes.js';
import adminReportRoutes from './routes/adminReportRoutes.js';
import publicOverviewRoutes from './routes/publicOverviewRoutes.js';
import passwordRecoveryRoutes from './routes/passwordRecoveryRoutes.js';
import profileEmailRoutes from './routes/profileEmailRoutes.js';
import staffBirthdayRoutes from './routes/staffBirthdayRoutes.js';
import portalAuth from './middleware/portalAuth.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import passwordChangeRoutes from './routes/passwordChangeRoutes.js';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

// Import Routes

// User routes
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import userRoutes from './routes/userRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import receivedAlertsRoutes from './routes/receivedAlertsRoutes.js';

//staff routes
import { getStaffDashboardData } from './controllers/staffController.js';
import masterlistRoutes from './routes/masterlistRoutes.js'; // Import the masterlist routes
import staffReqRoutes from './routes/staffReqRoutes.js'; // Import the staff request routes
import staffEmergencyRoutes from './routes/staffEmergencyRoutes.js'; // Import the staff emergency routes
import announcementRoutes from "./routes/announcementRoutes.js";
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import staffReportRoutes from './routes/staffReportRoutes.js';
import staffProfileRoutes from './routes/staffProfileRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import adminAccessRoutes from './routes/adminAccessRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import applicantRoutes from './routes/applicantRoutes.js';
import adminApprovalRoutes from './routes/adminApprovalRoutes.js';
const app = express();
let auditReady=false;

// Middleware
app.use(cors({exposedHeaders:['X-Audit-Status']}));
app.use((req,res,next)=>auditReady?next():res.status(503).json({success:false,message:'Backend is starting. Please try again shortly.'}));
app.use(resetGate);
app.use('/api/speech',speechRoutes);
app.use(express.json({ limit: "8mb" }));
app.use(systemAudit);
app.use('/api/logout',logoutRoutes);

app.use('/api/public',publicOverviewRoutes);
app.use('/api/admin-users',adminUserRoutes);
app.use('/api/password-change',passwordChangeRoutes);
app.use('/api/profile-email',profileEmailRoutes);
app.use('/api/password-recovery',passwordRecoveryRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/applicant', applicantRoutes);
app.use('/api/admin-approvals', adminApprovalRoutes);
app.use('/api/staff-membership',staffMembershipRoutes);
app.use('/api/request-tracking',requestTrackingRoutes);
app.use('/api/admin-access', adminAccessRoutes);
app.use('/api/admin-announcements',adminAnnouncementRoutes);
app.use('/api/admin-audit',adminAuditRoutes);
app.use('/api/admin-settings',systemSettingsRoutes);
app.use('/api/admin-reports',adminReportRoutes);
app.use('/api/admin-dashboard', adminDashboardRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/staff-profile', staffProfileRoutes);
app.use('/api/staff-reports', staffReportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Staff Dashboard Route
app.get('/api/staff-dashboard-data', portalAuth, getStaffDashboardData);
app.use('/api/staff-birthday-requests', staffBirthdayRoutes);
app.use('/api/users/pwd-members', masterlistRoutes);
app.use(staffReqRoutes); // Use the staff request routes
app.use('/api', staffEmergencyRoutes); // Use the staff emergency routes
app.use("/api/announcements", announcementRoutes);



// Use Routes
app.use('/api', authRoutes);                   // Halimbawa: POST /api/login
app.use('/api/service-requests', serviceRoutes); // Halimbawa: POST/GET /api/service-requests
app.use('/api/users', userRoutes);             // Kasama rito ang: /api/users/pwd-members (GET, POST, DELETE) at /api/users/profile/:acc_username (GET, PUT)
app.use('/api/emergency', emergencyRoutes);    // Halimbawa: POST /api/emergency/report
app.use('/api/received-alerts', receivedAlertsRoutes);

const PORT = process.env.PORT || 5000;
const server=app.listen(PORT,()=>{
 resetGeneration.initialize().then(()=>auditService.initialize()).then(()=>{auditReady=true;workflowNotifications.start();alertEmailQueue.start();console.log(`Server running on port ${PORT}`);}).catch(()=>{console.error('Unable to initialize backend metadata. Import system-audit.sql and full-system-reset.sql, then check the database connection.');server.close(()=>process.exit(1));});
});

