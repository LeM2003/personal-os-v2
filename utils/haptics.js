// Petite vibration du téléphone quand l'utilisateur valide une action.
// Utilise la Vibration API (Android / Chrome / Samsung Internet). Ignoré si non supporté.

export const haptic = (pattern = 10) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  } catch {
    // Silencieux : API non supportée (iOS Safari)
  }
}

export const hapticSuccess = () => haptic([5, 30, 5])
export const hapticWarning = () => haptic([10, 20, 10, 20])
