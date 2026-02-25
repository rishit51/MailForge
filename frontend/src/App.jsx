import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, AuthOnlyRoute } from "./components/routes/Routes";
import "./App.css";
import Landing from "./pages/Landing";
import ChooseDataset from "./pages/CampaignDataset";
import CampaignDetails from "./pages/CampaignDetails";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { EmailAccountsPage } from "./pages/EmailAccount";
import CreateCampaign from "./pages/CreateCampaign";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthOnlyRoute>
                <Login />
              </AuthOnlyRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <AuthOnlyRoute>
                <Signup />
              </AuthOnlyRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Landing />
              </ProtectedRoute>
            }
          ></Route>

          <Route
            path="/datasets"
            element={
              <ProtectedRoute>
                <DataSourcesPage />
              </ProtectedRoute>
            }
          ></Route>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <EmailAccountsPage />
              </ProtectedRoute>
            }
          ></Route>
          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute>
                <CreateCampaign />
              </ProtectedRoute>
            }
          ></Route>

          <Route
            path="/campaigns/new/details"
            element={
              <ProtectedRoute>
                <CampaignDetails />
              </ProtectedRoute>
            }
          ></Route>
          {/* Private */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
