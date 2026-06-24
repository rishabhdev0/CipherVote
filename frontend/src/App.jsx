import{Routes,Route,Navigate}from"react-router-dom";
import{AuthProvider}from"./context/AuthContext";import{Web3Provider}from"./context/Web3Context";import{SocketProvider}from"./context/SocketContext";
import LandingPage from"./pages/Landing";import LoginPage from"./pages/auth/Login";import RegisterPage from"./pages/auth/Register";import OTPPage from"./pages/auth/OTP";
import ParticipationDashboard from"./pages/ParticipationDashboard";
import VoterRegisterPage from"./pages/voter/Register";import VoterDashboard from"./pages/voter/Dashboard";import NFTPage from"./pages/voter/NFT";
import CandidateRegisterPage from"./pages/candidate/Register";import CandidateDashboard from"./pages/candidate/Dashboard";
import ElectionListPage from"./pages/elections/List";import ElectionEntryPage from"./pages/elections/Entry";import VotingPage from"./pages/elections/Vote";import ResultsPage from"./pages/elections/Results";
import AdminDashboard from"./pages/admin/Dashboard";import AdminAnalyticsPage from"./pages/admin/Analytics";import ElectionMgmtPage from"./pages/admin/Elections";import ElectionCreatePage from"./pages/admin/ElectionCreate";import ElectionConductPage from"./pages/admin/ElectionConduct";import ElectionRollPage from"./pages/admin/ElectionRoll";import CandidateReviewPage from"./pages/admin/Candidates";import FraudMonitorPage from"./pages/admin/Fraud";
import DisputeCenterPage from"./pages/admin/Disputes";import VoterMgmtPage from"./pages/admin/Voters";import AuditLogPage from"./pages/admin/Audit";import GovernancePage from"./pages/admin/Governance";
import NotFoundPage from"./pages/NotFound";import PrivateRoute from"./components/layout/PrivateRoute";import AdminRoute from"./components/layout/AdminRoute";
export default function App(){return(
  <AuthProvider><Web3Provider><SocketProvider>
    <Routes>
      <Route path="/" element={<LandingPage/>}/>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/register" element={<RegisterPage/>}/>
      <Route path="/verify" element={<OTPPage/>}/>
      <Route path="/elections" element={<ElectionListPage/>}/>
      <Route path="/elections/:id" element={<ElectionEntryPage/>}/>
      <Route path="/elections/:id/results" element={<ResultsPage/>}/>
      <Route path="/disputes" element={<DisputeCenterPage/>}/>
      <Route element={<PrivateRoute/>}>
        <Route path="/dashboard" element={<ParticipationDashboard/>}/>
        <Route path="/voter/register" element={<VoterRegisterPage/>}/>
        <Route path="/voter/dashboard" element={<VoterDashboard/>}/>
        <Route path="/voter/nft" element={<NFTPage/>}/>
        <Route path="/candidate/register" element={<CandidateRegisterPage/>}/>
        <Route path="/candidate/dashboard" element={<CandidateDashboard/>}/>
        <Route path="/elections/:id/vote" element={<VotingPage/>}/>
      </Route>
      <Route element={<AdminRoute/>}>
        <Route path="/admin" element={<AdminDashboard/>}/>
        <Route path="/admin/analytics" element={<AdminAnalyticsPage/>}/>
        <Route path="/admin/elections" element={<ElectionMgmtPage/>}/>
        <Route path="/admin/elections/new" element={<ElectionCreatePage/>}/>
        <Route path="/admin/elections/:id/conduct" element={<ElectionConductPage/>}/>
        <Route path="/admin/elections/:id/roll" element={<ElectionRollPage/>}/>
        <Route path="/admin/candidates" element={<CandidateReviewPage/>}/>
        <Route path="/admin/fraud" element={<FraudMonitorPage/>}/>
        <Route path="/admin/disputes" element={<DisputeCenterPage/>}/>
        <Route path="/admin/governance" element={<GovernancePage/>}/>
        <Route path="/admin/voters" element={<VoterMgmtPage/>}/>
        <Route path="/admin/audit" element={<AuditLogPage/>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  </SocketProvider></Web3Provider></AuthProvider>
);}
