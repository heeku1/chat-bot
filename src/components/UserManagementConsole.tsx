import { useState, FormEvent } from "react";
import { UserAccount } from "../types";
import { Users, UserPlus, ToggleLeft, ToggleRight, Trash2, Key, ShieldCheck, AlertCircle, Plus, Minus, X, Check, Save } from "lucide-react";

interface UserManagementConsoleProps {
  theme: "dark" | "light";
  users: UserAccount[];
  onUpdateUsers: (updatedUsers: UserAccount[]) => void;
  onClose: () => void;
}

export default function UserManagementConsole({ theme, users, onUpdateUsers, onClose }: UserManagementConsoleProps) {
  // New user form states
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newBotLimit, setNewBotLimit] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit user password state
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState("");

  const handleAddUser = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    const cleanName = newName.trim();

    if (!cleanUsername || !cleanPassword || !cleanName) {
      setError("❌ กรุณากรอกข้อมูลผู้ใช้ใหม่ให้ครบถ้วน");
      return;
    }

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      setError(`⚠️ ขออภัย ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว`);
      return;
    }

    const newUser: UserAccount = {
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: "member",
      isActive: true,
      botLimit: Math.max(1, newBotLimit),
      createdAt: new Date().toLocaleDateString('th-TH')
    };

    const updated = [...users, newUser];
    onUpdateUsers(updated);

    // Reset Form
    setNewUsername("");
    setNewPassword("");
    setNewName("");
    setNewBotLimit(3);
    setSuccess(`🎉 เพิ่มสมาชิก "${cleanName}" เรียบร้อยแล้ว!`);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleToggleStatus = (username: string) => {
    // Cannot toggle the master admin
    if (username === "admin") {
      setError("❌ ไม่สามารถเปิด/ปิด หรือปิดสิทธิ์ใช้งานบัญชี Master Admin สูงสุดได้");
      return;
    }

    const updated = users.map(u => {
      if (u.username === username) {
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleUpdateBotLimit = (username: string, change: number) => {
    const updated = users.map(u => {
      if (u.username === username) {
        const nextLimit = Math.max(1, u.botLimit + change);
        return { ...u, botLimit: nextLimit };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleDeleteUser = (username: string) => {
    if (username === "admin") {
      setError("❌ ไม่สามารถลบผู้ใช้งานสูงสุด Master Admin ได้");
      return;
    }

    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ "${username}" ออกจากระบบจำลองนี้? บอททั้งหมดของเขาก็จะไม่สามารถเข้าถึงได้`)) {
      const updated = users.filter(u => u.username !== username);
      onUpdateUsers(updated);
      setSuccess(`🗑️ ทำการลบผู้ใช้ "${username}" เรียบร้อยแล้ว`);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const startEditPassword = (u: UserAccount) => {
    setEditingUsername(u.username);
    setEditingPassword(u.password || "");
  };

  const saveNewPassword = () => {
    if (!editingPassword.trim()) return;
    const updated = users.map(u => {
      if (u.username === editingUsername) {
        return { ...u, password: editingPassword.trim() };
      }
      return u;
    });
    onUpdateUsers(updated);
    setEditingUsername(null);
    setEditingPassword("");
    setSuccess("🔑 อัปเดตรหัสผ่านใหม่สำเร็จแล้ว");
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-4xl rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300 ${
        theme === "light" ? "bg-white border-slate-200 text-slate-800" : "bg-[#111114] border-white/5 text-slate-100"
      }`}>
        
        {/* Header Title */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                👥 แผงบริหารจัดการสมาชิกและผู้ใช้งาน (User Management Console)
              </h3>
              <p className="text-[10px] text-gray-400">
                เพิ่มสมาชิกใหม่ คีย์เปิด-ปิดการใช้งาน (Active Status) และปรับแต่งโควตาจำนวนสร้างบอทสะสมของแต่ละคน
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            aria-label="ปิดหน้าจัดการผู้ใช้"
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Body Layout */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
          
          {/* Left Panel: Users Lists & Controls (7 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              รายชื่อสมาชิกทั้งหมดที่ลงทะเบียนคีย์ในระบบ
            </h4>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/10 rounded-xl p-3 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{success}</span>
              </div>
            )}

            <div className="space-y-3 overflow-y-auto max-h-[48vh] pr-1">
              {users.map((user) => {
                const isUserAdmin = user.role === "admin";
                return (
                  <div
                    key={user.username}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      user.isActive 
                        ? "bg-black/20 border-white/5" 
                        : "bg-rose-500/[0.02] border-rose-500/10 opacity-70"
                    }`}
                  >
                    {/* User Profile details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          {user.name}
                        </span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isUserAdmin 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15" 
                            : "bg-gray-800 text-gray-400"
                        }`}>
                          {isUserAdmin ? "MASTER ADMIN" : "MEMBER"}
                        </span>
                      </div>

                      <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                        <span>ID: <strong className="text-slate-300">{user.username}</strong></span>
                        <span>•</span>
                        {editingUsername === user.username ? (
                          <div className="flex items-center gap-1.5">
                            <span>รหัส:</span>
                            <input
                              type="text"
                              className="bg-black border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 focus:outline-none"
                              value={editingPassword}
                              onChange={(e) => setEditingPassword(e.target.value)}
                            />
                            <button
                              onClick={saveNewPassword}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-0.5 rounded cursor-pointer"
                              title="บันทึกรหัสผ่าน"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingUsername(null)}
                              className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-0.5 rounded cursor-pointer"
                              title="ยกเลิก"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1">
                            รหัส: <strong className="text-slate-300">{user.password}</strong>
                            <button
                              onClick={() => startEditPassword(user)}
                              className="text-indigo-400 hover:text-indigo-300 ml-1 hover:underline cursor-pointer"
                              title="เปลี่ยนรหัสผ่าน"
                            >
                              [แก้ไข]
                            </button>
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[9px]">สมัครเมื่อ: {user.createdAt || "7/7/2026"}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                      {/* Bot limits setting */}
                      <div className="flex flex-col items-center gap-1 bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <span className="text-[8px] uppercase tracking-wider text-gray-500 font-extrabold">โควตาบอท (Limit)</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateBotLimit(user.username, -1)}
                            disabled={isUserAdmin || user.botLimit <= 1}
                            className="p-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-gray-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[11px] font-extrabold text-indigo-400 font-mono w-5 text-center">
                            {user.botLimit}
                          </span>
                          <button
                            onClick={() => handleUpdateBotLimit(user.username, 1)}
                            disabled={isUserAdmin || user.botLimit >= 15}
                            className="p-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-gray-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Active Toggle & Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(user.username)}
                          disabled={isUserAdmin}
                          className={`p-1.5 rounded-xl border transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                            isUserAdmin 
                              ? "bg-indigo-500/10 border-indigo-500/10 text-indigo-300 opacity-60" 
                              : user.isActive
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/10 text-rose-400"
                          }`}
                          title={isUserAdmin ? "บัญชีแอดมินเปิดถาวร" : user.isActive ? "กดเพื่อปิดบัญชี" : "กดเพื่อเปิดบัญชี"}
                        >
                          {user.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                              <span>เปิดใช้งาน</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-rose-400" />
                              <span>ปิดใช้งาน</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          disabled={isUserAdmin}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 text-rose-400 border border-rose-500/10 rounded-xl transition-all cursor-pointer"
                          title="ลบสมาชิก"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Add New Member Form (4 cols) */}
          <div className="lg:col-span-4 bg-black/20 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              สร้าง / คีย์เปิดไอดีสมาชิกใหม่
            </h4>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400">ไอดีเข้าสู่ระบบ (Username)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
                  placeholder="e.g. staff2, custom_user"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400">รหัสผ่าน (Password)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
                  placeholder="e.g. pass1234"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400">ชื่อผู้ใช้งานจริง (Full Name)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100"
                  placeholder="e.g. สมศรี มั่งมี (Staff Somsri)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 flex justify-between">
                  <span>โควตาเพิ่มบอทสูงสุด (Bot Limit)</span>
                  <span className="text-indigo-400 font-extrabold font-mono">{newBotLimit} ตัว</span>
                </label>
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setNewBotLimit(prev => Math.max(1, prev - 1))}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-200 w-8 text-center">{newBotLimit}</span>
                  <button
                    type="button"
                    onClick={() => setNewBotLimit(prev => Math.min(15, prev + 1))}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 mt-2"
              >
                เพิ่มและเปิดสิทธิ์ใช้งานทันที
              </button>
            </form>

            <div className="text-[10px] text-gray-500 leading-relaxed bg-black/10 p-2.5 rounded-xl border border-white/5">
              💡 <strong>คำแนะนำ:</strong> เมื่อเพิ่มสำเร็จแล้ว สมาชิกคนนั้นจะสามารถล็อกอินด้วย Username และ Password นี้ และสร้างบอทได้ไม่เกิน {newBotLimit} ตัว โดยไม่มีหน้าต่างให้บุคคลทั่วไปสมัครเองอย่างปลอดภัย
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            aria-label="ปิดหน้าจัดการผู้ใช้"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
