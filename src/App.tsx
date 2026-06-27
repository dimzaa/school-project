import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface Student {
  id: string;
  name: string;
  mathGroup: number;
  mathGrade: number;
  engGrade: number;
  preAssigned: string | null;
  chosenMajors: string[];
  hasModifiedChoice: boolean;
}

interface Path {
  core: string;
  electives: string[];
  icon: string;
}

// Map DB row → app Student shape
function rowToStudent(row: any): Student {
  return {
    id: row.student_id,
    name: row.name,
    mathGroup: row.math_group,
    mathGrade: row.math_grade,
    engGrade: row.eng_grade,
    preAssigned: row.pre_assigned ?? null,
    chosenMajors: row.chosen_majors ?? [],
    hasModifiedChoice: row.has_modified_choice ?? false,
  };
}

export default function App() {
  const [studentsData, setStudentsData]       = useState<Student[]>([]);
  const [inputText, setInputText]             = useState("123456789, דני מצוין, 1, 80, 85\n987654321, נועה מדעים, 2, 70, 65\n111222333, רון אמנות, 3, 50, 70\n444555666, شירה משובצת, 4, 55, 60, مسرح\n777888999, يואב משובץ, 4, 40, 50, إعلام");
  const [studentIdInput, setStudentIdInput]   = useState('');
  const [currentStudent, setCurrentStudent]   = useState<Student | null>(null);
  const [isEditing, setIsEditing]             = useState(false);
  const [allowedPaths, setAllowedPaths]       = useState<Path[]>([]);
  const [selectedPath, setSelectedPath]       = useState<Path | null>(null);
  const [selectedElective, setSelectedElective] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [statusMsg, setStatusMsg]             = useState('');
  const [dbError, setDbError]                 = useState('');

  const [activeTab, setActiveTab]             = useState('student');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput]     = useState('');
  const ADMIN_PASSWORD                        = "school2024";   // ← שנה סיסמה כאן!

  // ── Load all students from DB on first render ──────────────────────────────
  useEffect(() => { loadFromDB(); }, []);

  const loadFromDB = async () => {
    setIsLoading(true);
    setDbError('');
    const { data, error } = await supabase.from('students').select('*');
    if (error) {
      setDbError('שגיאת חיבור למסד נתונים. בדוק את קובץ .env שלך.');
    } else {
      setStudentsData((data ?? []).map(rowToStudent));
    }
    setIsLoading(false);
  };

  // ── Admin login ────────────────────────────────────────────────────────────
  const handleAdminLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setActiveTab('admin');
      setPasswordInput('');
      loadFromDB();
    } else {
      alert('סיסמה שגויה!');
    }
  };

  // ── Load student list from CSV text → upsert to DB ────────────────────────
  const handleLoadData = async () => {
    setIsLoading(true);
    const parsed: Student[] = inputText
      .split('\n')
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 5) {
          return {
            id: parts[0], name: parts[1],
            mathGroup: parseInt(parts[2]), mathGrade: parseInt(parts[3]), engGrade: parseInt(parts[4]),
            preAssigned: parts[5] || null,
            chosenMajors: [], hasModifiedChoice: false,
          };
        }
        return null;
      })
      .filter((s): s is Student => s !== null);

    // Fetch existing records so we can preserve existing choices
    const { data: existing } = await supabase
      .from('students')
      .select('student_id, chosen_majors, has_modified_choice');
    const existingMap = new Map((existing ?? []).map((s: any) => [s.student_id, s]));

    const rows = parsed.map(s => {
      const ex = existingMap.get(s.id);
      return {
        student_id: s.id,
        name: s.name,
        math_group: s.mathGroup,
        math_grade: s.mathGrade,
        eng_grade: s.engGrade,
        pre_assigned: s.preAssigned,
        chosen_majors: ex?.chosen_majors ?? [],
        has_modified_choice: ex?.has_modified_choice ?? false,
      };
    });

    const { error } = await supabase
      .from('students')
      .upsert(rows, { onConflict: 'student_id' });

    if (error) {
      alert('שגיאה בשמירת נתונים: ' + error.message);
    } else {
      await loadFromDB();
      setStatusMsg('تم تحميل البيانات بنجاح! ✅');
      setTimeout(() => setStatusMsg(''), 3000);
    }
    setIsLoading(false);
  };

  // ── Calculate which study paths a student is allowed ──────────────────────
  const calculateAllowedPaths = (student: Student): Path[] => {
    const paths: Path[] = [];
    const { mathGroup: mG, mathGrade: mGr, engGrade: eGr } = student;

    if ((mG === 3 && mGr < 65) || mG === 4) {
      paths.push({ core: 'مسرح', electives: [], icon: '🎭' });
      return paths;
    }
    if (mG === 1 && mGr > 65 && eGr > 70) {
      paths.push({ core: 'فيزياء',  electives: ['علم الحاسوب', 'الكترونيكا'],                                    icon: '⚛️' });
      paths.push({ core: 'كيمياء',  electives: ['بيولوجيا', 'العلوم الطبية', 'الهندسة المعمارية'],              icon: '🧪' });
      paths.push({ core: 'بيولوجيا', electives: ['العلوم الطبية', 'الهندسة المعمارية'],                         icon: '🧬' });
    }
    if ((mG === 1 || mG === 2) && eGr > 60) {
      if (!paths.some(p => p.core === 'كيمياء'))   paths.push({ core: 'كيمياء',   electives: ['بيولوجيا', 'العلوم الطبية', 'الهندسة المعمارية'], icon: '🧪' });
      if (!paths.some(p => p.core === 'بيولوجيا')) paths.push({ core: 'بيولوجيا', electives: ['العلوم الطبية', 'الهندسة المعمارية'],              icon: '🧬' });
      if (!paths.some(p => p.core === 'إعلام'))    paths.push({ core: 'إعلام',    electives: ['بيولوجيا'],                                          icon: '🎥' });
      if (!paths.some(p => p.core === 'الكهرباء')) paths.push({ core: 'الكهرباء', electives: [],                                                    icon: '⚡' });
    }
    if ((mG === 2 && mGr < 65) || mG === 3) {
      if (!paths.some(p => p.core === 'مسرح'))     paths.push({ core: 'مسرح',     electives: [],               icon: '🎭' });
      if (!paths.some(p => p.core === 'إعلام'))    paths.push({ core: 'إعلام',    electives: ['بيولوجيا'],     icon: '🎥' });
      if (!paths.some(p => p.core === 'الكهرباء')) paths.push({ core: 'الكهرباء', electives: [],               icon: '⚡' });
    }
    return paths;
  };

  // ── Student login — query DB directly for freshest data ───────────────────
  const handleStudentLogin = async () => {
    const cleanId = studentIdInput.trim();
    if (!cleanId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', cleanId)
      .single();

    setIsLoading(false);
    if (error || !data) {
      alert('رقم الهوية غير موجود في النظام.');
      return;
    }

    const student = rowToStudent(data);
    setCurrentStudent(student);
    setIsEditing(false);
    if (!student.preAssigned) setAllowedPaths(calculateAllowedPaths(student));
    setSelectedPath(null);
    setSelectedElective(null);
    setSelectionMessage('');
  };

  // ── Student submits their choice → save to DB ─────────────────────────────
  const submitSelection = async () => {
    if (!currentStudent || !selectedPath) return;
    if (selectedPath.electives.length > 0 && !selectedElective) {
      alert('⚠️ مطلوب اختيار تخصص إضافي');
      return;
    }

    const finalChoices = selectedElective
      ? [selectedPath.core, selectedElective]
      : [selectedPath.core];
    const newHasModified = isEditing ? true : (currentStudent.hasModifiedChoice || false);

    setIsLoading(true);
    const { error } = await supabase
      .from('students')
      .update({ chosen_majors: finalChoices, has_modified_choice: newHasModified })
      .eq('student_id', currentStudent.id);
    setIsLoading(false);

    if (error) { alert('שגיאה בשמירת הבחירה. נסה שוב.'); return; }

    setStudentsData(prev =>
      prev.map(s => s.id === currentStudent.id
        ? { ...s, chosenMajors: finalChoices, hasModifiedChoice: newHasModified }
        : s)
    );
    setSelectionMessage(`أهلاً ${currentStudent.name}، تم استلام اختيارك! 🎉\nلقد قمت باختيار مسار: ${finalChoices.join(' + ')}.`);

    setTimeout(() => {
      setCurrentStudent(null); setStudentIdInput('');
      setSelectionMessage(''); setSelectedPath(null); setSelectedElective(null);
    }, 8000);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const csvContent = studentsData.map(s =>
      `${s.id}, ${s.name}, ${s.mathGroup}, ${s.mathGrade}, ${s.engGrade}, ${s.preAssigned || ''}, ${s.chosenMajors.join(' + ')}`
    ).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students_choices.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">

      {/* Loading bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 z-50 bg-indigo-200 overflow-hidden">
          <div className="h-full bg-indigo-600 animate-pulse w-1/2 mx-auto rounded-full" />
        </div>
      )}

      {/* DB error banner */}
      {dbError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-center py-2 px-4 text-sm font-medium">
          ⚠️ {dbError}
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200 pt-6 pb-4 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <h2 className="text-xl md:text-2xl font-bold text-gray-600 mb-2">المدرسة الثانوية كفرقرع على اسم احمد عبد الله يحيى</h2>
        <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-l from-indigo-700 to-blue-600 tracking-tight">
          نظام اختيار التخصصات
        </h1>
      </header>

      {/* Admin nav */}
      {isAdminLoggedIn && (
        <div className="flex justify-center gap-2 p-4 bg-gray-100 border-b overflow-x-auto">
          <button onClick={() => setActiveTab('admin')}   className={`px-4 md:px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'admin'   ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'}`}>ניהול והגדרות</button>
          <button onClick={() => { setActiveTab('results'); loadFromDB(); }} className={`px-4 md:px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'results' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'}`}>תוצאות</button>
          <button onClick={() => { setIsAdminLoggedIn(false); setActiveTab('student'); }} className="px-4 md:px-6 py-2 rounded-full font-bold transition-all bg-rose-100 text-rose-700 hover:bg-rose-200 shadow-sm mr-4">יציאה מניהול</button>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col justify-between">

        {/* ── Admin login screen ──────────────────────────────────────────── */}
        {activeTab === 'adminLogin' && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center mt-10">
            <h2 className="text-2xl font-bold text-indigo-800 mb-6">כניסת מנהלת</h2>
            <input
              type="password" placeholder="סיסמה"
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              className="w-full p-4 border-2 border-indigo-100 rounded-xl mb-4 text-center text-xl focus:border-indigo-500"
            />
            <button onClick={handleAdminLogin} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors">כניסה</button>
            <button onClick={() => setActiveTab('student')} className="mt-4 text-gray-500 underline text-sm hover:text-gray-700">חזרה למסך הראשי</button>
          </div>
        )}

        {/* ── Admin data management ───────────────────────────────────────── */}
        {activeTab === 'admin' && isAdminLoggedIn && (
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">ניהול נתונים</h2>
            {statusMsg && <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-3 text-center font-bold">{statusMsg}</div>}
            <textarea value={inputText} onChange={e => setInputText(e.target.value)}
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl mb-4 font-mono text-left" dir="ltr" />
            <button onClick={handleLoadData} disabled={isLoading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors text-lg disabled:opacity-60">
              {isLoading ? '...טוען' : 'טען נתונים למערכת'}
            </button>
          </div>
        )}

        {/* ── Results table ───────────────────────────────────────────────── */}
        {activeTab === 'results' && isAdminLoggedIn && (
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">תוצאות בזמן אמת</h2>
              <div className="flex gap-2">
                <button onClick={loadFromDB} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold transition-all">🔄 רענן</button>
                <button onClick={handleExport} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all">ייצוא לאקסל</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">ת"ז</th>
                    <th className="p-3 border-b">שם</th>
                    <th className="p-3 border-b">שיבוץ מראש</th>
                    <th className="p-3 border-b">בחירה</th>
                    <th className="p-3 border-b">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData.map((s, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{s.id}</td>
                      <td className="p-3">{s.name}</td>
                      <td className="p-3">{s.preAssigned || '-'}</td>
                      <td className="p-3 font-bold text-indigo-700">{s.chosenMajors.join(' + ') || '-'}</td>
                      <td className="p-3">
                        {s.chosenMajors.length > 0
                          ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">✓ בחר</span>
                          : <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">ממתין</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-gray-400 mt-3 text-left">סה"כ: {studentsData.length} תלמידים | בחרו: {studentsData.filter(s => s.chosenMajors.length > 0).length}</p>
            </div>
          </div>
        )}

        {/* ── Student screen ──────────────────────────────────────────────── */}
        {activeTab === 'student' && (
          <div className="max-w-3xl mx-auto w-full">
            {!currentStudent ? (
              <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 text-center mt-10 relative">
                <h2 className="text-3xl font-black text-gray-800 mb-2">أهلاً بك!</h2>
                <p className="text-gray-500 mb-8 text-lg">אנא הזדהו כדי לגלות את המסלולים שלכם</p>
                <div className="max-w-xs mx-auto">
                  <input type="text" placeholder="رقم الهوية"
                    value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                    className="w-full p-4 border-2 border-indigo-100 rounded-2xl mb-4 text-center text-xl font-bold focus:border-indigo-500 transition-colors" />
                  <button onClick={handleStudentLogin} disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:shadow-lg transition-all text-xl disabled:opacity-60">
                    {isLoading ? '...' : 'دخول'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mt-4">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-8 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black">أهلاً {currentStudent.name}</h2>
                    <p className="opacity-90">رقم الهوية: {currentStudent.id}</p>
                  </div>
                  <button onClick={() => setCurrentStudent(null)} className="bg-white/20 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm">خروج</button>
                </div>

                <div className="p-6 md:p-10">
                  {currentStudent.preAssigned ? (
                    <div className="p-10 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-100 text-center">
                      <h3 className="text-3xl font-black text-purple-900 mb-4">التخصص الذي خصص لك هو:</h3>
                      <div className="inline-block bg-white text-purple-800 px-10 py-5 rounded-2xl text-4xl font-black shadow-lg">{currentStudent.preAssigned}</div>
                    </div>
                  ) : selectionMessage ? (
                    <div className="p-10 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 rounded-3xl border border-emerald-100 text-center shadow-inner">
                      <div className="text-7xl mb-6">🎉</div>
                      <h3 className="text-2xl font-bold whitespace-pre-line leading-relaxed mb-6">{selectionMessage}</h3>
                      <div className="bg-amber-100 border-r-4 border-amber-500 p-4 rounded-xl text-right">
                        <p className="text-amber-900 font-bold">📌 الموافقة النهائية على التخصص تخضع لقرار إدارة المدرسة، وسيتم الإعلان عن النتائج النهائية قريباً.</p>
                      </div>
                    </div>
                  ) : currentStudent.chosenMajors?.length > 0 && !isEditing ? (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-4">مسارك الحالي المعتمد</h3>
                      <div className="inline-block bg-indigo-100 text-indigo-800 px-6 py-3 rounded-xl text-xl font-black">{currentStudent.chosenMajors.join(' + ')}</div>
                      <div className="mt-8">
                        {!currentStudent.hasModifiedChoice
                          ? <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold">تعديل الاختيار (متاح لمرة واحدة ⚠️)</button>
                          : <p className="text-rose-600 font-bold flex items-center justify-center gap-2"><span>🔒</span> هذا الاختيار نهائي.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">اختيار المسار التعليمي الرئيسي</h3>
                        <p className="text-gray-600 mb-6">المسارات المعروضة أدناه تم تخصيصها شخصياً لتناسب تحصيلك العلمي:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {allowedPaths.map(path => (
                            <button key={path.core}
                              onClick={() => { setSelectedPath(path); setSelectedElective(null); }}
                              className={`p-6 rounded-2xl border-4 flex flex-col items-center gap-3 transition-all ${selectedPath?.core === path.core ? 'bg-indigo-50 border-indigo-600 shadow-md scale-[1.02]' : 'bg-white border-transparent shadow-sm hover:border-indigo-100'}`}>
                              <span className="text-4xl">{path.icon}</span>
                              <span className="font-black text-lg">{path.core}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedPath && selectedPath.electives.length > 0 && (
                        <div className="border-t pt-8">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">اختيار التخصص الإضافي</h3>
                          <p className="text-gray-600 mb-4">لإكمال مسار {selectedPath.core}، يجب اختيار موضوع إضافي:</p>
                          <div className="flex flex-wrap gap-4">
                            {selectedPath.electives.map(elective => (
                              <button key={elective} onClick={() => setSelectedElective(elective)}
                                className={`p-4 rounded-xl border-2 font-bold ${selectedElective === elective ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                                {elective}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPath && (
                        <div className="pt-8 border-t">
                          <button onClick={submitSelection} disabled={isLoading || (selectedPath.electives.length > 0 && !selectedElective)}
                            className={`w-full py-4 rounded-2xl text-xl font-black transition-all ${(selectedPath.electives.length > 0 && !selectedElective) || isLoading ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg'}`}>
                            {isLoading ? '...שומר'
                              : selectedPath.electives.length > 0 && !selectedElective
                              ? '⚠️ مطلوب اختيار تخصص إضافي'
                              : 'تأكيد وإرسال الاختيار 🚀'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {!isAdminLoggedIn && activeTab === 'student' && (
        <footer className="w-full text-center py-6 mt-auto">
          <button onClick={() => setActiveTab('adminLogin')} className="text-gray-300 hover:text-gray-500 text-xs transition-colors">
            כניסת מנהלת ⚙️
          </button>
        </footer>
      )}
    </div>
  );
}
