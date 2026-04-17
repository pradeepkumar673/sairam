/**
 * mockData.ts
 * Centralized realistic fallback data for AI features.
 * Use these to ensure the application never crashes during a demo.
 */

export const MOCK_MOOD_RESULT = {
  emotion: "content",
  confidence: 88,
  suggestion: "You look quite peaceful and content today! It's a great time to enjoy a light activity or some quiet reflection.",
  subEmotions: { peace: 0.9, serenity: 0.8, joy: 0.2 }
};

export const MOCK_VOICE_RESULT = {
  emotion: "calm",
  stressLevel: "low",
  confidence: 85,
  suggestion: "I can hear a gentle tone in your voice. Staying relaxed is wonderful for your heart health!"
};

export const MOCK_PRESCRIPTION_RESULT = {
  diagnosis: "Hypertension & Type 2 Diabetes Management",
  medicines: [
    { name: "Amlodipine Besylate (5mg)", dosage: "1 Tablet", instructions: "Take once daily in the morning before food" },
    { name: "Metformin HCl (500mg)", dosage: "1 Tablet", instructions: "Take twice daily with meals (Breakfast and Dinner)" }
  ],
  dietaryAdvice: "Low sodium and low carbohydrate diet recommended."
};

export const MOCK_INJURY_RESULT = {
  severity: "moderate",
  possibleInjury: "Moderate Laceration with irregular margins on the palmar surface. Hemostasis appears controlled, but wound depth may require clinical closure.",
  immediateAction: "Apply gentle pressure with sterile gauze and seek professional medical evaluation for potential sutures.",
  requiresDoctor: true,
  requiresEmergency: false,
  careInstructions: [
    "Irrigate the wound with sterile saline if available, or clean tap water.",
    "Do not apply antiseptic directly into the deep tissue.",
    "Apply a non-stick sterile dressing and secure firmly.",
    "Keep the hand elevated above heart level to reduce swelling.",
    "Monitor for signs of secondary infection (throbbing, pus, or fever)."
  ]
};

export const MOCK_RECIPE_RESULT = {
  recipeName: "Fresh Mediterranean Garden Salad",
  description: "A bright, light, and nutritious salad that boosts mood and energy.",
  ingredients: ["Cucumber", "Olive Oil", "Lemon", "Pinch of Salt", "Tomatoes", "Bell Peppers"],
  instructions: [
    "Wash all fresh vegetables thoroughly.",
    "Chop ingredients into bite-sized pieces.",
    "Toss gently in a large bowl with olive oil and fresh lemon juice.",
    "Serve chilled for maximum freshness."
  ],
  nutritionBenefits: "Rich in antioxidants and Vitamin C for mood support.",
  suitableFor: ["General Wellness", "Heart Health"],
  prepTime: "15 mins"
};

export const MOCK_SLEEP_STORY = {
  title: "The Whispering Pine Forest",
  story: "Once upon a time, there was a forest where the trees hummed a gentle lullaby. As the stars twinkled above, every leaf turned into a soft pillow of moonlight. You find a comfortable mossy path that leads to a calm, clear stream, where the water flows in perfect harmony with your breath...",
  theme: "nature",
  duration: "5 mins"
};

export const MOCK_CHAT_RESPONSE = {
  response: "I'm here for you and I'm listening. That sounds interesting; tell me more about how you're feeling today, or is there something specific we should talk about?"
};
