import { Navigate, Route, Routes } from 'react-router-dom'

import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { GoogleCompletePage } from './pages/GoogleCompletePage'
import { DashboardPage } from './pages/DashboardPage'
import { SetupPage } from './pages/SetupPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { StudentListPage } from './pages/students/StudentListPage'
import { StudentFormPage } from './pages/students/StudentFormPage'
import { StudentProfilePage } from './pages/students/StudentProfilePage'
import { ClassesPage } from './pages/classes/ClassesPage'
import { ClassRosterPage } from './pages/classes/ClassRosterPage'
import { AttendanceDashboardPage } from './pages/attendance/AttendanceDashboardPage'
import { TakeAttendancePage } from './pages/attendance/TakeAttendancePage'
import { AttendanceHistoryPage } from './pages/attendance/AttendanceHistoryPage'
import { ProfilePage } from './pages/ProfilePage'
import { StartPage } from './pages/StartPage'
import { SettingsPage } from './pages/SettingsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { CertificatesPage } from './pages/certificates/CertificatesPage'
import { GenerateCertificatePage } from './pages/certificates/GenerateCertificatePage'
import { FeesPage } from './pages/fees/FeesPage'
import { FeeStructurePage } from './pages/fees/FeeStructurePage'
import { FeeStructureEditorPage } from './pages/fees/FeeStructureEditorPage'
import { StudentFeePage } from './pages/fees/StudentFeePage'
import { NewChargePage } from './pages/fees/NewChargePage'
import { ChargeDetailPage } from './pages/fees/ChargeDetailPage'
import { CalendarPage } from './pages/CalendarPage'
import { PlanPage } from './pages/PlanPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { ReportViewPage } from './pages/reports/ReportViewPage'
import { AssessmentsPage } from './pages/assessments/AssessmentsPage'
import { NewAssessmentPage } from './pages/assessments/NewAssessmentPage'
import { AssessmentDetailPage } from './pages/assessments/AssessmentDetailPage'
import { ResultEntryPage } from './pages/assessments/ResultEntryPage'
import { StudentResultPage } from './pages/assessments/StudentResultPage'
import { StaffPage } from './pages/staff/StaffPage'
import { StaffFormPage } from './pages/staff/StaffFormPage'
import { StaffDetailPage } from './pages/staff/StaffDetailPage'
import { PayrollRunPage } from './pages/staff/PayrollRunPage'
import { ZapGate } from './components/zap/ZapShell'
import { ZapOverviewPage } from './pages/zap/ZapOverviewPage'
import { ZapSchoolsPage } from './pages/zap/ZapSchoolsPage'
import { ZapSchoolPage } from './pages/zap/ZapSchoolPage'
import { ZapLoginsPage } from './pages/zap/ZapLoginsPage'
import { ZapLicensesPage } from './pages/zap/ZapLicensesPage'
import { ZapPlansPage } from './pages/zap/ZapPlansPage'
import { ZapPaymentsPage } from './pages/zap/ZapPaymentsPage'
import { SchoolGate } from './components/license/LicenseGate'
import { ChoosePlanPage } from './pages/ChoosePlanPage'
import { ZapTemplatesPage } from './pages/zap/ZapTemplatesPage'
import { ZapTemplateEditorPage } from './pages/zap/ZapTemplateEditorPage'

// Sidebar modules not built yet.
const COMING_SOON: [string, string][] = [
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
      <Route path="/choose-plan" element={<ChoosePlanPage />} />
      {/* School pages: shown only while the school has a usable licence (else its Plan page / a notice) */}
      <Route element={<SchoolGate />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/certificates/generate" element={<GenerateCertificatePage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/fees/structure" element={<FeeStructurePage />} />
        <Route path="/fees/structure/:classId" element={<FeeStructureEditorPage />} />
        <Route path="/fees/students/:id" element={<StudentFeePage />} />
        <Route path="/fees/charges/new" element={<NewChargePage />} />
        <Route path="/fees/charges/:id" element={<ChargeDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:key" element={<ReportViewPage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/assessments/new" element={<NewAssessmentPage />} />
        <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
        <Route path="/assessments/:id/sections/:rowId" element={<ResultEntryPage />} />
        <Route path="/assessments/:id/students/:studentId" element={<StudentResultPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/staff/new" element={<StaffFormPage />} />
        <Route path="/staff/payroll/:runId" element={<PayrollRunPage />} />
        <Route path="/staff/:id" element={<StaffDetailPage />} />
        <Route path="/staff/:id/edit" element={<StaffFormPage />} />
        <Route path="/students" element={<StudentListPage />} />
        <Route path="/students/new" element={<StudentFormPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/students/:id/edit" element={<StudentFormPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/attendance" element={<AttendanceDashboardPage />} />
        <Route path="/attendance/take" element={<TakeAttendancePage />} />
        <Route path="/attendance/history" element={<AttendanceHistoryPage />} />
        <Route path="/classes/:classId" element={<ClassRosterPage />} />
        <Route path="/classes/:classId/sections/:sectionId" element={<ClassRosterPage />} />
      </Route>
      {/* Website admin (us) - opened by logging in with the backend's admin credentials */}
      <Route path="/zap" element={<ZapGate />}>
        <Route index element={<ZapOverviewPage />} />
        <Route path="schools" element={<ZapSchoolsPage />} />
        <Route path="schools/:id" element={<ZapSchoolPage />} />
        <Route path="logins" element={<ZapLoginsPage />} />
        <Route path="licenses" element={<ZapLicensesPage />} />
        <Route path="plans" element={<ZapPlansPage />} />
        <Route path="payments" element={<ZapPaymentsPage />} />
        <Route path="templates" element={<ZapTemplatesPage />} />
        <Route path="templates/new" element={<ZapTemplateEditorPage />} />
        <Route path="templates/:id" element={<ZapTemplateEditorPage />} />
        <Route path="*" element={<Navigate to="/zap" replace />} />
      </Route>
      {COMING_SOON.map(([path, title]) => (
        <Route key={path} path={path} element={<ComingSoonPage title={title} />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
