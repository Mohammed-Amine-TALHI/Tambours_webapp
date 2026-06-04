import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import {
  RequireAuth,
  RequireAdmin,
  RequirePasswordChange,
  PublicOnly,
} from './auth/guards'

import Login           from './pages/Login'
import FirstLogin      from './pages/FirstLogin'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import MasterSchema    from './pages/operator/MasterSchema'
import ConveyorView    from './pages/operator/ConveyorView'
import DrumDetail      from './pages/operator/DrumDetail'
import AdminLayout     from './layouts/AdminLayout'
import UsersList       from './pages/admin/UsersList'
import UserNew         from './pages/admin/UserNew'
import SchemaImport    from './pages/admin/SchemaImport'
import SchemaDesign    from './pages/admin/SchemaDesign'
import AdminConveyor   from './pages/admin/AdminConveyor'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"            element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/forgot-password"  element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/reset-password"   element={<PublicOnly><ResetPassword /></PublicOnly>} />

          {/* Forced password change */}
          <Route
            path="/first-login"
            element={<RequirePasswordChange><FirstLogin /></RequirePasswordChange>}
          />

          {/* Operateur + admin workspace */}
          <Route path="/app"                  element={<RequireAuth><MasterSchema /></RequireAuth>} />
          <Route path="/app/conveyors/:id"    element={<RequireAuth><ConveyorView /></RequireAuth>} />
          <Route path="/app/drums/:id"        element={<RequireAuth><DrumDetail /></RequireAuth>} />

          {/* Admin-only */}
          <Route
            path="/admin"
            element={<RequireAdmin><AdminLayout /></RequireAdmin>}
          >
            <Route index element={<Navigate to="design" replace />} />
            <Route path="design"        element={<SchemaDesign />} />
            <Route path="conveyors/:id" element={<AdminConveyor />} />
            <Route path="users"         element={<UsersList />} />
            <Route path="users/new"     element={<UserNew />} />
            <Route path="import"        element={<SchemaImport />} />
          </Route>

          {/* Catch-all */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
