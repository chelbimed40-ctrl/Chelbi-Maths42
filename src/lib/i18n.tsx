"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "ar" | "fr";

const T = {
  // ─── Header / Nav ───
  "النجاح في الرياضيات": { fr: "Réussite en Maths" },
  "الأستاذ محمد شلبي": { fr: "Prof. Mohamed Chelbi" },
  "لوحة": { fr: "Tableau" },
  "إجابات": { fr: "Réponses" },
  "استفتاء": { fr: "Sondage" },
  "أدوات": { fr: "Outils" },
  "بوابة التلميذ": { fr: "Portail élève" },
  "خروج": { fr: "Déconnexion" },

  // ─── Auth ───
  "اسم المستخدم": { fr: "Nom d'utilisateur" },
  "كلمة المرور": { fr: "Mot de passe" },
  "دخول الأستاذ": { fr: "Connexion professeur" },
  "دخول التلميذ": { fr: "Connexion élève" },
  "الاسم واللقب": { fr: "Nom et prénom" },
  "تسجيل دخول الأستاذ": { fr: "Connexion professeur" },
  "لوحة تحكم الأستاذ محمد شلبي": { fr: "Tableau de bord — Prof. Mohamed Chelbi" },
  "نسيت كلمة المرور؟ تواصل عبر الواتساب": { fr: "Mot de passe oublié ? Contactez via WhatsApp" },
  "طلب الانضمام": { fr: "Demander l'adhésion" },
  "طلب الانضمام للمجموعة": { fr: "Demander l'adhésion au groupe" },

  // ─── Teacher Dashboard ───
  "المجموعات": { fr: "Groupes" },
  "التلاميذ المقبولون": { fr: "Élèves acceptés" },
  "بانتظار الموافقة": { fr: "En attente" },
  "الاختبارات": { fr: "Examens" },
  "مجموعة جديدة": { fr: "Nouveau groupe" },
  "اختبار جديد": { fr: "Nouvel examen" },
  "إدارة المجموعة": { fr: "Gérer le groupe" },
  "فتح المحرر": { fr: "Ouvrir l'éditeur" },
  "إنشاء": { fr: "Créer" },
  "إنشاء المجموعة": { fr: "Créer le groupe" },
  "إنشاء وتحرير": { fr: "Créer et éditer" },

  // ─── Student Dashboard ───
  "انضم إلى جلسة مباشرة": { fr: "Rejoindre une session en direct" },
  "انضمام": { fr: "Rejoindre" },
  "مستوى إنجازك": { fr: "Ton niveau" },
  "مجموعاتي": { fr: "Mes groupes" },
  "سجل نتائجي": { fr: "Mon historique" },
  "النتائج": { fr: "Résultats" },
  "نقطة": { fr: "pts" },
  "مقبول": { fr: "Accepté" },
  "بانتظار": { fr: "En attente" },
  "درجة": { fr: "pts" },
  "سؤال": { fr: "question" },

  // ─── Session ───
  "إرسال الإجابة": { fr: "Envoyer la réponse" },
  "صواب": { fr: "Vrai" },
  "خطأ": { fr: "Faux" },
  "إجابة صحيحة!": { fr: "Bonne réponse !" },
  "إجابة غير صحيحة هذه المرة": { fr: "Réponse incorrecte cette fois" },
  "الإجابة الصحيحة:": { fr: "La bonne réponse :" },
  "الإجابة الصحيحة كانت:": { fr: "La bonne réponse était :" },
  "تأكيد الإجابة الصحيحة": { fr: "Confirmation de la bonne réponse" },
  "واصل التركيز — القادم أفضل": { fr: "Reste concentré — la prochaine sera meilleure" },
  "تم إرسال الإجابة بنجاح": { fr: "Réponse envoyée avec succès" },
  "انتظر السؤال التالي من الأستاذ...": { fr: "Attends la question suivante du professeur..." },
  "عودة إلى حسابي": { fr: "Retour à mon compte" },
  "مراجعة إجاباتك": { fr: "Révision de tes réponses" },
  "ترتيب الجلسة": { fr: "Classement de la session" },
  "انتهت الجلسة!": { fr: "Session terminée !" },
  "نتيجتك": { fr: "Ton score" },
  "ترتيبك": { fr: "Ton rang" },

  // ─── Exercise/Quiz editor ───
  "نص السؤال": { fr: "Texte de la question" },
  "صورة السؤال (اختياري)": { fr: "Image de la question (optionnel)" },
  "إضافة السؤال": { fr: "Ajouter la question" },
  "حفظ التعديلات": { fr: "Enregistrer" },
  "إضافة سؤال جديد": { fr: "Ajouter une nouvelle question" },

  // ─── Common ───
  "إغلاق": { fr: "Fermer" },
  "حذف": { fr: "Supprimer" },
  "تعديل": { fr: "Modifier" },
  "نشر": { fr: "Publier" },
  "قبول": { fr: "Accepter" },
  "رفض": { fr: "Refuser" },
  "إزالة": { fr: "Retirer" },
  "تعليق": { fr: "Suspendre" },
  "نسخ الرابط": { fr: "Copier le lien" },
  "تم النسخ": { fr: "Copié" },
  "الرئيسية": { fr: "Accueil" },

  // ─── Math keyboard ───
  "إظهار الرموز الرياضية والهندسية": { fr: "Afficher les symboles mathématiques" },
  "إخفاء الرموز الرياضية والهندسية": { fr: "Masquer les symboles mathématiques" },
} as const;

type TKey = keyof typeof T;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang] = useState<Lang>("ar");

  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    try {
      localStorage.setItem("sim-lang", "ar");
    } catch {}
  }, []);

  function setLang(_: Lang) {
    // الواجهة مضبوطة بالعربية فقط وفق الطلب الحالي
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    try {
      localStorage.setItem("sim-lang", "ar");
    } catch {}
  }

  function t(key: string): string {
    return key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function LangSwitcher(_: { className?: string }) {
  return null;
}
