import Heatmap from './Heatmap';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" }}>
      <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-4 md:gap-5" dir="rtl">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="אשכול גליל מזרחי"
                className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-xl bg-slate-50 border border-slate-100 p-1"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                  מערכת פוטנציאל תיירותי
                </h1>
                <p className="text-slate-500 text-sm md:text-base mt-1">
                  ניתוח מרחבי חכם על בסיס מלונות, אטרקציות, אתרי רט״ג ונתוני ביקורים שנתיים
                </p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs md:text-sm font-medium px-3 py-2 rounded-full self-start">
              נתונים חיים מ־ArcGIS Online
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm">
          <Heatmap />
        </div>

        <p className="text-center text-xs text-slate-400 pb-2">
          ציון הפוטנציאל מבוסס על צפיפות חדרי מלון, כמות אטרקציות ואתרי טבע, וסך ביקורים שנתיים במרחב הנבחר
        </p>
      </div>
    </div>
  );
}
