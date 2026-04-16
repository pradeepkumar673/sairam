/**
 * RecipeSuggester.tsx
 * Enter available ingredients → calls POST /api/ai/recipe-suggest
 * Returns 3 healthy recipes with step-by-step instructions.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, X, Plus, Trash2, ChefHat, Loader2, Clock, Leaf } from 'lucide-react';
import api from '../lib/api';

interface Recipe {
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  nutritionBenefits: string;
  suitableFor: string[];
  prepTime: string;
}

interface RecipeSuggesterProps {
  onClose: () => void;
}

const COMMON_INGREDIENTS = [
  'Rice', 'Dal', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Potato',
  'Spinach', 'Carrot', 'Milk', 'Egg', 'Bread', 'Oats', 'Banana',
  'Apple', 'Curd', 'Oil', 'Salt', 'Turmeric', 'Cumin',
];

const RESTRICTIONS = ['Diabetic-friendly', 'Low sodium', 'Vegetarian', 'Vegan', 'Gluten-free', 'Low fat'];

export default function RecipeSuggester({ onClose }: RecipeSuggesterProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addIngredient = (val: string) => {
    const v = val.trim();
    if (v && !ingredients.includes(v)) {
      setIngredients(prev => [...prev, v]);
    }
    setInputVal('');
  };

  const removeIngredient = (i: string) => setIngredients(prev => prev.filter(x => x !== i));

  const toggleRestriction = (r: string) =>
    setRestrictions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const suggest = async () => {
    if (ingredients.length === 0) {
      setError('Add at least one ingredient.');
      return;
    }
    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const res = await api.post('/ai/recipe-suggest', {
        ingredients,
        restrictions: restrictions.length ? restrictions : undefined,
        mood: mood || undefined,
      });
      const data = res.data.data;
      // backend returns either data.recipes or the array directly
      const list: Recipe[] = Array.isArray(data) ? data : (data.recipes || data);
      setRecipes(list);
      setExpanded(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28 }}
          className="w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[36px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-amber-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-gray-900">Recipe Suggester</h3>
                <p className="text-xs text-gray-500">AI-powered healthy recipe ideas</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {recipes.length === 0 ? (
              <>
                {/* Ingredients input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    What's in your kitchen? 🥘
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addIngredient(inputVal); }
                      }}
                      placeholder="e.g. Rice, Dal, Spinach..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      onClick={() => addIngredient(inputVal)}
                      className="w-11 h-11 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition flex-shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick add chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {COMMON_INGREDIENTS.filter(i => !ingredients.includes(i)).map(i => (
                      <button
                        key={i}
                        onClick={() => addIngredient(i)}
                        className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full hover:bg-amber-100 transition"
                      >
                        + {i}
                      </button>
                    ))}
                  </div>

                  {/* Selected ingredients */}
                  {ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {ingredients.map(i => (
                        <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-warm-100 text-warm-800 text-sm font-semibold rounded-full">
                          {i}
                          <button onClick={() => removeIngredient(i)} className="hover:text-red-500 transition ml-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dietary restrictions */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Dietary needs (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {RESTRICTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => toggleRestriction(r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          restrictions.includes(r)
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        {restrictions.includes(r) ? '✓ ' : ''}{r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">How are you feeling? (optional)</label>
                  <input
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. tired, energetic, sad, happy..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">{error}</div>
                )}

                <button
                  onClick={suggest}
                  disabled={loading || ingredients.length === 0}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-[24px] flex items-center justify-center gap-3 transition shadow-lg shadow-amber-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Finding recipes...
                    </>
                  ) : (
                    <>
                      <Utensils className="w-6 h-6" />
                      Suggest Recipes
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Recipe cards */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-lg">🍽️ {recipes.length} Recipes Found</p>
                  <button
                    onClick={() => { setRecipes([]); setExpanded(null); }}
                    className="text-sm text-warm-600 font-semibold hover:underline"
                  >
                    Search Again
                  </button>
                </div>

                {recipes.map((recipe, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => setExpanded(expanded === idx ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="font-bold text-gray-900 text-[16px]">{recipe.recipeName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" /> {recipe.prepTime}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Leaf className="w-3 h-3" /> {recipe.suitableFor?.join(', ') || 'All'}
                          </span>
                        </div>
                      </div>
                      <span className="text-2xl">{expanded === idx ? '▲' : '▼'}</span>
                    </button>

                    <AnimatePresence>
                      {expanded === idx && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-4 border-t border-amber-50">
                            {/* Nutrition */}
                            <div className="bg-emerald-50 rounded-2xl px-4 py-3 mt-3">
                              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Nutrition Benefits</p>
                              <p className="text-emerald-800 text-sm">{recipe.nutritionBenefits}</p>
                            </div>

                            {/* Ingredients */}
                            <div>
                              <p className="font-bold text-gray-800 mb-2 text-sm">Ingredients</p>
                              <ul className="space-y-1">
                                {recipe.ingredients.map((ing, i) => (
                                  <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">•</span> {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Instructions */}
                            <div>
                              <p className="font-bold text-gray-800 mb-2 text-sm">Instructions</p>
                              <ol className="space-y-2">
                                {recipe.instructions.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-warm-500 hover:bg-warm-600 text-white font-bold rounded-[24px] transition mt-2"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
