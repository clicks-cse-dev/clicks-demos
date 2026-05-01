export type ProjectType = 'zimmer' | 'hotel' | 'attraction' | 'restaurant'
export type ZoningCategory = 'agricultural' | 'tourism' | 'residential' | 'commercial' | 'openSpace'
export type DecisionColor = 'green' | 'yellow' | 'red'

export interface DecisionInput {
  projectType: ProjectType
  zoningCategory: ZoningCategory
  requiredAreaSqm: number
  parcelAreaSqm: number
}

const baseDecisionTable: Record<ZoningCategory, Record<ProjectType, DecisionColor>> = {
  tourism: {
    zimmer: 'green',
    hotel: 'green',
    attraction: 'green',
    restaurant: 'green',
  },
  agricultural: {
    zimmer: 'yellow',
    hotel: 'red',
    attraction: 'yellow',
    restaurant: 'yellow',
  },
  residential: {
    zimmer: 'yellow',
    hotel: 'red',
    attraction: 'red',
    restaurant: 'yellow',
  },
  commercial: {
    zimmer: 'red',
    hotel: 'yellow',
    attraction: 'green',
    restaurant: 'green',
  },
  openSpace: {
    zimmer: 'red',
    hotel: 'red',
    attraction: 'red',
    restaurant: 'red',
  },
}

export function classifyZoningCategory(rawZoningText: string): ZoningCategory {
  const text = rawZoningText.trim().toLowerCase()

  if (text.includes('חקלא')) return 'agricultural'
  if (text.includes('תייר') || text.includes('נופש') || text.includes('קייט') || text.includes('מלונ')) {
    return 'tourism'
  }
  if (text.includes('מגורים')) return 'residential'
  if (text.includes('מסחר') || text.includes('עסקים')) return 'commercial'
  if (text.includes('פתוח') || text.includes('שמורה') || text.includes('גן לאומי') || text.includes('יער')) {
    return 'openSpace'
  }

  return 'openSpace'
}

export function evaluateDecision(input: DecisionInput): DecisionColor {
  const base = baseDecisionTable[input.zoningCategory][input.projectType]

  if (input.requiredAreaSqm > input.parcelAreaSqm) {
    return 'red'
  }

  if (input.requiredAreaSqm > input.parcelAreaSqm * 0.7 && base === 'green') {
    return 'yellow'
  }

  return base
}

export function projectLabel(type: ProjectType): string {
  switch (type) {
    case 'zimmer':
      return 'צימרים'
    case 'hotel':
      return 'מלון'
    case 'attraction':
      return 'אטרקציה'
    case 'restaurant':
      return 'מסעדה'
  }
}

export function zoningLabel(category: ZoningCategory): string {
  switch (category) {
    case 'agricultural':
      return 'חקלאי'
    case 'tourism':
      return 'תיירות / נופש'
    case 'residential':
      return 'מגורים'
    case 'commercial':
      return 'מסחרי'
    case 'openSpace':
      return 'שטח פתוח / שמורה'
  }
}

export function decisionTitle(color: DecisionColor): string {
  if (color === 'green') return 'התאמה גבוהה (ירוק)'
  if (color === 'yellow') return 'התאמה מותנית (צהוב)'
  return 'לא מתאים (אדום)'
}

export function decisionExplanation(params: {
  color: DecisionColor
  zoning: ZoningCategory
  rawZoningText?: string
  projectType: ProjectType
}): string {
  const zoning = params.rawZoningText?.trim() || zoningLabel(params.zoning)
  const project = projectLabel(params.projectType)

  if (params.color === 'green') {
    return `החלקה מסווגת כ-${zoning}. ${project} מותר ישירות לפי הייעוד הקיים. השטח שלך נכנס במגבלות. ניתן להתקדם להגשת בקשה רשמית.`
  }

  if (params.color === 'yellow') {
    const route = params.zoning === 'residential' ? 'הקלה' : 'שימוש חורג'
    return `החלקה מסווגת כ-${zoning}. ${project} לא מותר ישירות, אך ניתן באמצעות ${route}. תהליך זה לוקח כ-6-12 חודשים ודורש אישור הוועדה המקומית.`
  }

  return `החלקה מסווגת כ-${zoning}. ${project} לא ישים בייעוד הזה. נדרש שינוי תב"ע - תהליך של 2-4 שנים ללא הבטחת אישור. מומלץ לשקול מיקום חלופי.`
}
