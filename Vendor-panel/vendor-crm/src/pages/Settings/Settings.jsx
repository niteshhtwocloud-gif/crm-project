import { useState } from "react";
import { LuBuilding2, LuUpload, LuLock, LuGlobe, LuSave, LuEye, LuEyeOff } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./Settings.css";

export default function Settings() {
  const { showToast } = useToast();
  const { companySettings, setCompanySettings, prefs, setPrefs } = useCRM();

  const [form, setForm] = useState({
    companyName: companySettings.companyName,
    email: companySettings.email,
    phone: companySettings.phone,
    gst: companySettings.gst,
  });

  const [security, setSecurity] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    theme: prefs.theme,
    language: prefs.language,
    timezone: prefs.timezone,
  });

  const updateForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateSecurity = (e) => {
    const { name, value } = e.target;
    setSecurity((prev) => ({ ...prev, [name]: value }));
  };

  const updatePrefs = (e) => {
    const { name, value } = e.target;
    setLocalPrefs((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = (e) => {
    e.preventDefault();
    setCompanySettings(form);
    showToast("Company profile updated successfully");
  };

  const savePassword = (e) => {
    e.preventDefault();
    if (!security.next || security.next !== security.confirm) {
      showToast("New password and confirmation don't match");
      return;
    }
    setSecurity({ current: "", next: "", confirm: "" });
    showToast("Password updated successfully");
  };

  const savePrefs = (e) => {
    e.preventDefault();
    setPrefs(localPrefs);
    showToast(`Preferences saved. Theme: ${localPrefs.theme}`);
  };

  return (
    <div className="settings-page">
      <div className="settings-grid">
        <form className="table-card settings-card" onSubmit={saveProfile}>
          <div className="settings-card-title"><LuBuilding2 size={18} /> Company Profile</div>

          <div className="logo-upload-row">
            <div className="logo-preview">VC</div>
            <button type="button" className="upload-btn" onClick={() => showToast("Logo upload opened")}>
              <LuUpload size={14} /> Upload Logo
            </button>
          </div>

          <label className="field-label">Company Name</label>
          <input className="field-input" name="companyName" value={form.companyName} onChange={updateForm} />

          <label className="field-label">Email</label>
          <input className="field-input" type="email" name="email" value={form.email} onChange={updateForm} />

          <label className="field-label">Phone</label>
          <input className="field-input" name="phone" value={form.phone} onChange={updateForm} />

          <label className="field-label">GST Number</label>
          <input className="field-input" name="gst" value={form.gst} onChange={updateForm} />

          <button className="save-btn" type="submit"><LuSave size={15} /> Save Changes</button>
        </form>

        <form className="table-card settings-card" onSubmit={savePassword}>
          <div className="settings-card-title"><LuLock size={18} /> Change Password</div>

          <label className="field-label">Current Password</label>
          <div style={{ position: 'relative' }}>
            <input className="field-input" type={showCurrent ? "text" : "password"} name="current" value={security.current} onChange={updateSecurity} placeholder="••••••••" style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
              {showCurrent ? <LuEyeOff size={18} /> : <LuEye size={18} />}
            </button>
          </div>

          <label className="field-label">New Password</label>
          <div style={{ position: 'relative' }}>
            <input className="field-input" type={showNext ? "text" : "password"} name="next" value={security.next} onChange={updateSecurity} placeholder="••••••••" style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowNext(!showNext)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
              {showNext ? <LuEyeOff size={18} /> : <LuEye size={18} />}
            </button>
          </div>

          <label className="field-label">Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input className="field-input" type={showConfirm ? "text" : "password"} name="confirm" value={security.confirm} onChange={updateSecurity} placeholder="••••••••" style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
              {showConfirm ? <LuEyeOff size={18} /> : <LuEye size={18} />}
            </button>
          </div>

          <button className="save-btn" type="submit"><LuSave size={15} /> Update Password</button>
        </form>

        <form className="table-card settings-card" onSubmit={savePrefs}>
          <div className="settings-card-title"><LuGlobe size={18} /> Preferences</div>

          <label className="field-label">Theme</label>
          <select className="field-input" name="theme" value={localPrefs.theme} onChange={updatePrefs}>
            <option>Light</option>
            <option>Dark</option>
            <option>System</option>
          </select>

          <label className="field-label">Language</label>
          <select className="field-input" name="language" value={localPrefs.language} onChange={updatePrefs}>
            <option>English</option>
            <option>Hindi</option>
            <option>Gujarati</option>
          </select>

          <label className="field-label">Timezone</label>
          <select className="field-input" name="timezone" value={localPrefs.timezone} onChange={updatePrefs}>
            <option>Asia/Kolkata (IST)</option>
            <option>Asia/Dubai (GST)</option>
            <option>UTC</option>
          </select>

          <button className="save-btn" type="submit"><LuSave size={15} /> Save Preferences</button>
        </form>
      </div>
    </div>
  );
}

