'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, ChefHat, Sparkles, Bookmark, BookmarkCheck, Loader2, ArrowRight, Trash2, Share2, Camera, Settings2, RefreshCw, AlertCircle, Star } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import SplashScreen from './SplashScreen';
import NutrientVisualizer from './NutrientVisualizer';
import { db, auth } from '../firebase';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

type Review = {
  id: string;
  recipeId: string;
  rating: number;
  text?: string;
  date: string;
};

type Ingredient = {
  item: string;
  quantity: string;
  unit: string;
};

type Recipe = {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  categories?: string[];
  nutrition?: {
    calories: string;
    protein: string;
    fat: string;
    carbs: string;
  };
  note?: string;
  substitutionImpact?: string;
  nutritionalComparison?: string;
  tips?: string[];
  variations?: {
    name: string;
    description: string;
  }[];
};

const GENERATOR_MODES = ["Impress guests", "5-ingredient meals", "One-pot only", "Rs. 100 per serving max", "College hostel setup (no oven)"];
const CHEF_PERSONALITIES = ["Strict Chef 😤", "Friendly Grandma 👵", "Gym Coach 💪", "Savage Internet Chef", "Chill Friend Chef"];
const EMOTIONAL_STATES = ["Neutral", "Sad", "Stressed", "Happy", "Motivated"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Pro"];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'High-Protein'];
const HEALTH_CONDITIONS = ['Diabetes-friendly', 'Nut-Free', 'Low FODMAP (IBS)', 'Heart Healthy'];
const SPICE_LEVELS = ['Mild', 'Medium', 'Spicy', 'Extra Spicy'];
const CUISINES = ['Indian', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Middle Eastern', 'American'];
const DEFAULT_SUGGESTED_INGREDIENTS = ['Chicken', 'Paneer', 'Eggs', 'Tomatoes', 'Onions', 'Potatoes', 'Rice', 'Lentils', 'Spinach', 'Garlic', 'Ginger'];

export default function RecipeApp({ chefPersonality, setChefPersonality }: { chefPersonality: string, setChefPersonality: (p: string) => void }) {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [popularIngredients, setPopularIngredients] = useState<string[]>(DEFAULT_SUGGESTED_INGREDIENTS);
  const [isEditingPopular, setIsEditingPopular] = useState(false);
  const [newPopularIngredient, setNewPopularIngredient] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [strictMode, setStrictMode] = useState(false);
  const [dietary, setDietary] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<string>('Medium');
  const [fusionCuisines, setFusionCuisines] = useState<string[]>([]);
  const [generatorMode, setGeneratorMode] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<string>('Intermediate');
  const [muscleGain, setMuscleGain] = useState(false);
  const [budget, setBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(500);
  const [lazyMode, setLazyMode] = useState(false);
  const [emotionalState, setEmotionalState] = useState<string>('Neutral');
  const [isScanning, setIsScanning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'generator' | 'saved'>('generator');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterCuisine, setFilterCuisine] = useState<string>('All');
  const [filterPrepTime, setFilterPrepTime] = useState<string>('All');
  const [filterDiet, setFilterDiet] = useState<string>('All');

  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => console.error('Auth error:', error));
    }
    const saved = localStorage.getItem('savedRecipes');
    if (saved) {
      try {
        setSavedRecipes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved recipes');
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('recipeId');
    if (recipeId) {
      const fetchRecipe = async () => {
        try {
          const docRef = doc(db, 'recipes', recipeId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRecipe(docSnap.data() as Recipe);
            setView('generator');
          }
        } catch (e) {
          console.error('Failed to fetch shared recipe', e);
        }
      };
      fetchRecipe();
    }
  }, []);

  if (isSplashVisible) {
    return <SplashScreen onComplete={() => setIsSplashVisible(false)} />;
  }

  const saveToLocalStorage = (recipes: Recipe[]) => {
    localStorage.setItem('savedRecipes', JSON.stringify(recipes));
    setSavedRecipes(recipes);
  };

  const handleAddIngredient = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setInputValue('');
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const toggleDietary = (option: string) => {
    setDietary(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const toggleHealthCondition = (option: string) => {
    setHealthConditions(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const toggleFusionCuisine = (option: string) => {
    setFusionCuisines(prev => {
      if (prev.includes(option)) return prev.filter(o => o !== option);
      if (prev.length >= 2) return [prev[1], option];
      return [...prev, option];
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        try {
          URL.revokeObjectURL(objectUrl);
          
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("Could not get canvas context");
          
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = dataUrl.split(',')[1];
          
          const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
          if (!apiKey) {
            alert("Configuration Error: NEXT_PUBLIC_GEMINI_API_KEY is missing. Please add it to your Vercel Environment Variables and redeploy without build cache.");
            setIsScanning(false);
            return;
          }
          
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                { text: "Identify the edible food ingredients in this image. Return ONLY a comma-separated list of the ingredient names. Do not include quantities or other text." }
              ]
            }
          });
          
          if (response.text) {
            const newIngredients = response.text.split(',').map(i => i.trim()).filter(i => i);
            setIngredients(prev => [...new Set([...prev, ...newIngredients])]);
          }
        } catch (error: any) {
          console.error("Error scanning ingredients:", error);
          alert(`Failed to scan ingredients: ${error?.message || 'Unknown error'}. Please check your API key and try again.`);
        } finally {
          setIsScanning(false);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setIsScanning(false);
        alert("Failed to load image from your device.");
      };
      
      img.src = objectUrl;
    } catch (error: any) {
      console.error("Setup error:", error);
      setIsScanning(false);
      alert(`Failed to process image: ${error?.message || 'Unknown error'}`);
    }
  };

  const generateRecipe = async (isRandom = false) => {
    setLoading(true);
    setRecipe(null);
    setView('generator');
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Configuration Error: NEXT_PUBLIC_GEMINI_API_KEY is missing. Please add it to your Vercel Environment Variables and redeploy without build cache.");
        setLoading(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const baseInstructions = `
        CRITICAL INSTRUCTIONS:
        - Use Indian English phrasing and terminology in the instructions (e.g., use words like 'bhunno', 'tadka', 'whistle' for pressure cooker if applicable, and general Indian English sentence structures).
        - Ensure the recipe is easy to understand for Indian families.
        - Keep the ingredients familiar and easily available to Indian families.
      `;

      let prompt = "";
      if (isRandom) {
        prompt = `Generate a random, delicious recipe. ${baseInstructions}`;
      } else {
        if (ingredients.length === 0) {
          alert("Please add some ingredients first, or try a random recipe!");
          setLoading(false);
          return;
        }
        prompt = `Generate a recipe using some or all of these ingredients: ${ingredients.join(', ')}. 
        ${strictMode 
          ? "CRITICAL: DO NOT add ANY extra ingredients. ONLY use the ingredients provided. You may use water, salt, and basic cooking oil, but NOTHING else (no extra vegetables, no extra meats, no extra dairy, no extra spices unless listed)." 
          : "CRITICAL: DO NOT add any major ingredients (like extra vegetables, meats, dairy, grains) that are not explicitly listed here. You may ONLY add basic pantry staples (salt, spices, oil, butter, water, garlic, ginger, onions) if absolutely necessary."
        }
        ${baseInstructions}`;
      }

      if (dietary.length > 0) {
        prompt += `\nThe recipe MUST strictly adhere to these dietary preferences: ${dietary.join(', ')}.`;
      }
      if (muscleGain) {
        prompt += `\nThe recipe MUST be focused on muscle gain (high protein).`;
      }
      if (generatorMode) {
        prompt += `\nThe recipe MUST follow this mode: ${generatorMode}.`;
      }
      if (budget) {
        prompt += `\nThe recipe MUST be budget-friendly, costing under ₹${budgetAmount}, and optimized for cost vs nutrition.`;
      }
      if (lazyMode) {
        prompt += `\nThe recipe MUST be in "Lazy Mode": minimal steps, minimal dishes, and cooking time under 15 minutes.`;
      }
      if (chefPersonality) {
        prompt += `\nAdopt the persona of a ${chefPersonality}. Your tone, style, and instructions should reflect this personality.`;
      }
      if (emotionalState && emotionalState !== 'Neutral') {
        prompt += `\nThe user is currently feeling: ${emotionalState}. Adapt the recipe suggestions and cooking instructions to match this mood (e.g., comfort food for sadness, simple meals for stress).`;
      }
      prompt += `\nCRITICAL: When suggesting ingredient substitutions, explain the potential impact on taste and texture (e.g., how butter vs oil affects mouthfeel and browning).`;
      prompt += `\nCRITICAL: Provide a brief explanation of the nutritional differences between the generated recipe and a 'standard' version of the same dish, especially when modifications are made for dietary or health reasons.`;
      prompt += `\nCRITICAL: Provide 3-5 specific cooking tips and techniques relevant to the recipe's instructions or ingredients, tailored to the user's skill level: ${skillLevel}.`;
      prompt += `\nCRITICAL: Generate 3 variations of this recipe (e.g., a spicier version, a healthier version, or a version using different core ingredients).`;
      prompt += `\nThe skill level of the instructions should be: ${skillLevel}.`;
      if (healthConditions.length > 0) {
        prompt += `\nThe recipe MUST be suitable for these health conditions: ${healthConditions.join(', ')}.`;
      }
      if (spiceLevel) {
        prompt += `\nThe spice level should be: ${spiceLevel}.`;
      }
      if (fusionCuisines.length === 2) {
        prompt += `\nCreate a creative Cuisine Fusion combining: ${fusionCuisines[0]} and ${fusionCuisines[1]}.`;
      } else if (fusionCuisines.length === 1) {
        prompt += `\nThe cuisine style should be: ${fusionCuisines[0]}.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The name of the recipe" },
              description: { type: Type.STRING, description: "A short, appetizing description" },
              ingredients: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    unit: { type: Type.STRING }
                  },
                  required: ["item", "quantity", "unit"]
                },
                description: "List of ingredients with quantities and units"
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step by step cooking instructions"
              },
              prepTime: { type: Type.STRING, description: "Preparation time (e.g., '15 mins')" },
              cookTime: { type: Type.STRING, description: "Cooking time (e.g., '30 mins')" },
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of categories this recipe belongs to (e.g., 'Italian', 'Vegan', 'Dessert', 'Quick Meals')"
              },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.STRING, description: "Estimated calories per serving (e.g., '450 kcal')" },
                  protein: { type: Type.STRING, description: "Estimated protein per serving (e.g., '25g')" },
                  fat: { type: Type.STRING, description: "Estimated fat per serving (e.g., '15g')" },
                  carbs: { type: Type.STRING, description: "Estimated carbohydrates per serving (e.g., '40g')" }
                },
                required: ["calories", "protein", "fat", "carbs"]
              },
              note: { type: Type.STRING, description: "A note about the recipe generation, e.g., fusion or specific inputs used" },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3-5 specific cooking tips and techniques relevant to the recipe, tailored to the user's skill level."
              },
              variations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["name", "description"]
                },
                description: "3 variations of this recipe."
              }
            },
            required: ["title", "description", "ingredients", "instructions", "prepTime", "cookTime", "categories", "nutrition", "note", "tips", "variations"]
          }
        }
      });

      if (response.text) {
        let text = response.text.trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        const data = JSON.parse(text);
        setRecipe({
          id: crypto.randomUUID(),
          ...data
        });
      }
    } catch (error: any) {
      console.error("Error generating recipe:", error);
      alert(`Failed to generate recipe: ${error?.message || 'Unknown error'}. Please check your API key and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const swapDiet = async (recipeToSwap: Recipe, targetDiet: string) => {
    setLoading(true);
    setRecipe(null);
    setView('generator');
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Configuration Error: NEXT_PUBLIC_GEMINI_API_KEY is missing. Please add it to your Vercel Environment Variables and redeploy without build cache.");
        setLoading(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Take the following recipe and modify it to be strictly ${targetDiet}.
        CRITICAL INSTRUCTIONS:
        - Use Indian English phrasing and terminology in the instructions (e.g., use words like 'bhunno', 'tadka', 'whistle' for pressure cooker if applicable, and general Indian English sentence structures).
        - Ensure the recipe is easy to understand for Indian families.
        - Keep the ingredients familiar and easily available to Indian families.
        ${muscleGain ? "- The recipe MUST be focused on muscle gain (high protein)." : ""}
        ${generatorMode ? `- The recipe MUST follow this mode: ${generatorMode}.` : ""}
        - The skill level of the instructions should be: ${skillLevel}.
        
        Original Recipe:
        Title: ${recipeToSwap.title}
        Description: ${recipeToSwap.description}
        Ingredients: ${recipeToSwap.ingredients.map(i => `${i.quantity} ${i.unit} ${i.item}`).join(', ')}
        Instructions: ${recipeToSwap.instructions.join('\n')}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The name of the recipe" },
              description: { type: Type.STRING, description: "A short, appetizing description" },
              ingredients: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    unit: { type: Type.STRING }
                  },
                  required: ["item", "quantity", "unit"]
                },
                description: "List of ingredients with quantities and units"
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step by step cooking instructions"
              },
              prepTime: { type: Type.STRING, description: "Preparation time (e.g., '15 mins')" },
              cookTime: { type: Type.STRING, description: "Cooking time (e.g., '30 mins')" },
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of categories this recipe belongs to (e.g., 'Italian', 'Vegan', 'Dessert', 'Quick Meals')"
              },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.STRING, description: "Estimated calories per serving (e.g., '450 kcal')" },
                  protein: { type: Type.STRING, description: "Estimated protein per serving (e.g., '25g')" },
                  fat: { type: Type.STRING, description: "Estimated fat per serving (e.g., '15g')" },
                  carbs: { type: Type.STRING, description: "Estimated carbohydrates per serving (e.g., '40g')" }
                },
                required: ["calories", "protein", "fat", "carbs"]
              },
              note: { type: Type.STRING, description: "A note about the recipe generation, e.g., fusion or specific inputs used" }
            },
            required: ["title", "description", "ingredients", "instructions", "prepTime", "cookTime", "categories", "nutrition", "note"]
          }
        }
      });

      if (response.text) {
        let text = response.text.trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        const data = JSON.parse(text);
        setRecipe({
          id: crypto.randomUUID(),
          ...data
        });
      }
    } catch (error: any) {
      console.error("Error swapping diet:", error);
      alert(`Failed to modify recipe: ${error?.message || 'Unknown error'}. Please check your API key and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveRecipe = (recipeToToggle: Recipe) => {
    const isSaved = savedRecipes.some(r => r.id === recipeToToggle.id);
    if (isSaved) {
      saveToLocalStorage(savedRecipes.filter(r => r.id !== recipeToToggle.id));
    } else {
      saveToLocalStorage([...savedRecipes, recipeToToggle]);
    }
  };

  const isRecipeSaved = (id: string) => savedRecipes.some(r => r.id === id);

  const savedCategories = ['All', ...Array.from(new Set(savedRecipes.flatMap(r => r.categories || [])))].sort();
  const filteredSavedRecipes = savedRecipes.filter(r => {
    const matchesCategory = selectedCategory === 'All' || r.categories?.includes(selectedCategory);
    const matchesCuisine = filterCuisine === 'All' || r.categories?.includes(filterCuisine);
    const matchesDiet = filterDiet === 'All' || r.categories?.includes(filterDiet);
    
    const prepTimeMinutes = parseInt(r.prepTime) || 0;
    const matchesPrepTime = filterPrepTime === 'All' || 
      (filterPrepTime === '< 30 mins' && prepTimeMinutes < 30) ||
      (filterPrepTime === '< 1 hour' && prepTimeMinutes < 60) ||
      (filterPrepTime === '1 hour+' && prepTimeMinutes >= 60);

    return matchesCategory && matchesCuisine && matchesDiet && matchesPrepTime;
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
      {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Missing API Key in Vercel</p>
            <p className="opacity-90">Next.js cannot see your NEXT_PUBLIC_GEMINI_API_KEY. This means it was either not set correctly, or you are viewing a Preview URL but the key is only set for Production.</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between mb-16">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => { setView('generator'); setRecipe(null); }}
        >
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <ChefHat size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">What&apos;s In?</h1>
        </div>
        
        <button 
          onClick={() => setView(view === 'saved' ? 'generator' : 'saved')}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors px-4 py-2 rounded-full hover:bg-gray-100"
        >
          <Bookmark size={16} />
          {savedRecipes.length} Saved
        </button>
      </header>

      <AnimatePresence mode="wait">
        {view === 'generator' && !recipe && !loading && (
          <motion.div 
            key="input-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Ingredients Input */}
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-medium tracking-tight mb-2">What&apos;s in your kitchen?</h2>
                <p className="text-gray-500">Add ingredients you want to use.</p>
              </div>
              
              <form onSubmit={handleAddIngredient} className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. Chicken breast, garlic, spinach..."
                    className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-black text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <label className="flex-shrink-0 aspect-square h-[60px] bg-white border border-gray-200 text-gray-600 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-sm relative overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                  {isScanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera size={24} />}
                </label>
              </form>

              {/* Popular Ingredients */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">Popular ingredients:</p>
                  <button 
                    onClick={() => setIsEditingPopular(!isEditingPopular)}
                    className="text-xs font-medium text-gray-400 hover:text-black transition-colors"
                  >
                    {isEditingPopular ? 'Done' : 'Edit'}
                  </button>
                </div>
                
                {isEditingPopular && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newPopularIngredient.trim() && !popularIngredients.includes(newPopularIngredient.trim())) {
                        setPopularIngredients([...popularIngredients, newPopularIngredient.trim()]);
                        setNewPopularIngredient('');
                      }
                    }}
                    className="flex gap-2 mb-3"
                  >
                    <input
                      type="text"
                      value={newPopularIngredient}
                      onChange={(e) => setNewPopularIngredient(e.target.value)}
                      placeholder="Add new popular ingredient"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                    <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-sm">Add</button>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {popularIngredients.map(ing => (
                      <motion.div 
                        key={ing}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="relative group"
                      >
                        <button
                          onClick={() => !isEditingPopular && setIngredients(prev => [...prev, ing])}
                          className={`px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors shadow-sm ${isEditingPopular ? 'pr-8' : ''}`}
                        >
                          {isEditingPopular ? ing : `+ ${ing}`}
                        </button>
                        {isEditingPopular && (
                          <button
                            onClick={() => setPopularIngredients(popularIngredients.filter(i => i !== ing))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {ingredients.length > 0 && (
                <div className="space-y-3 pt-6">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-gray-500">{ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} added</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            type="checkbox" 
                            checked={strictMode}
                            onChange={(e) => setStrictMode(e.target.checked)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/20 checked:bg-black checked:border-black transition-all cursor-pointer"
                          />
                          <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-black transition-colors">Strict Mode</span>
                      </label>
                      <button 
                        onClick={() => setIngredients([])}
                        className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Clear all
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {ingredients.map(ing => (
                        <motion.span
                          key={ing}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium shadow-sm"
                        >
                          {ing}
                          <button 
                            onClick={() => removeIngredient(ing)}
                            className="text-gray-400 hover:text-black transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </section>

            {/* Dietary Preferences */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Dietary Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(option => {
                  const active = dietary.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleDietary(option)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                        active 
                          ? 'bg-black text-white border-black' 
                          : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
                <button
                  key="Muscle Gain"
                  onClick={() => setMuscleGain(!muscleGain)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    muscleGain 
                      ? 'bg-black text-white border-black' 
                      : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Muscle Gain
                </button>
              </div>
            </section>

            {/* Advanced Options Toggle */}
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              <Settings2 size={16} />
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Taste Profile, Health, Fusion)'}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-8 overflow-hidden"
                >
                  {/* Generator Mode */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Generator Mode</h3>
                    <div className="flex flex-wrap gap-2">
                      {GENERATOR_MODES.map(mode => {
                        const active = generatorMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setGeneratorMode(generatorMode === mode ? null : mode)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Budget & Lazy Mode */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Special Modes</h3>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            type="checkbox" 
                            checked={budget}
                            onChange={(e) => setBudget(e.target.checked)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/20 checked:bg-black checked:border-black transition-all cursor-pointer"
                          />
                          <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-black transition-colors">Budget Mode</span>
                      </label>
                      {budget && (
                        <input 
                          type="number"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(Number(e.target.value))}
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                          placeholder="₹ Amount"
                        />
                      )}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <input 
                            type="checkbox" 
                            checked={lazyMode}
                            onChange={(e) => setLazyMode(e.target.checked)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/20 checked:bg-black checked:border-black transition-all cursor-pointer"
                          />
                          <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-black transition-colors">Lazy Mode</span>
                      </label>
                    </div>
                  </section>

                  {/* AI Chef Personality */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">AI Chef Personality</h3>
                    <div className="flex flex-wrap gap-2">
                      {CHEF_PERSONALITIES.map(personality => {
                        const active = chefPersonality === personality;
                        return (
                          <button
                            key={personality}
                            onClick={() => setChefPersonality(personality)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {personality}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Emotional State */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">How are you feeling?</h3>
                    <div className="flex flex-wrap gap-2">
                      {EMOTIONAL_STATES.map(state => {
                        const active = emotionalState === state;
                        return (
                          <button
                            key={state}
                            onClick={() => setEmotionalState(state)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {state}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Skill Level */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Skill Level</h3>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_LEVELS.map(level => {
                        const active = skillLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setSkillLevel(level)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Health Conditions */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Health Conditions</h3>
                    <div className="flex flex-wrap gap-2">
                      {HEALTH_CONDITIONS.map(option => {
                        const active = healthConditions.includes(option);
                        return (
                          <button
                            key={option}
                            onClick={() => toggleHealthCondition(option)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Taste Profile - Spice Level */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Spice Level</h3>
                    <div className="flex flex-wrap gap-2">
                      {SPICE_LEVELS.map(level => {
                        const active = spiceLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setSpiceLevel(level)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Cuisine Fusion */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Cuisine Fusion (Select up to 2)</h3>
                    <div className="flex flex-wrap gap-2">
                      {CUISINES.map(cuisine => {
                        const active = fusionCuisines.includes(cuisine);
                        return (
                          <button
                            key={cuisine}
                            onClick={() => toggleFusionCuisine(cuisine)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                              active 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {cuisine}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="pt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => generateRecipe(false)}
                className="flex-1 bg-black text-white rounded-2xl py-4 px-6 font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-[0.98] shadow-md"
              >
                <ChefHat size={20} />
                Generate Recipe
              </button>
              <button
                onClick={() => generateRecipe(true)}
                className="sm:w-auto w-full bg-white border border-gray-200 text-black rounded-2xl py-4 px-6 font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm"
              >
                <Sparkles size={20} />
                Surprise Me
              </button>
            </div>
          </motion.div>
        )}

        {loading && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-black text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-xl"
            >
              <ChefHat size={48} />
            </motion.div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center"
            >
              <h3 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">Cooking up your recipe</h3>
              <p className="text-gray-500">Our AI chef is mixing the ingredients...</p>
            </motion.div>
          </motion.div>
        )}

        {recipe && !loading && view === 'generator' && (
          <motion.div 
            key="recipe-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <button 
              onClick={() => setRecipe(null)}
              className="text-sm font-medium text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
              Back to ingredients
            </button>

            <RecipeCard 
              key={recipe.id}
              recipe={recipe} 
              isSaved={isRecipeSaved(recipe.id)}
              onSave={() => toggleSaveRecipe(recipe)}
              onSwapDiet={(diet) => swapDiet(recipe, diet)}
            />
          </motion.div>
        )}

        {view === 'saved' && (
          <motion.div
            key="saved-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-3xl font-medium tracking-tight mb-2">Saved Recipes</h2>
              <p className="text-gray-500">Your personal cookbook.</p>
            </div>

            {savedRecipes.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-gray-200 rounded-3xl bg-white">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No saved recipes yet</h3>
                <p className="text-gray-500 mb-6">Recipes you save will appear here.</p>
                <button 
                  onClick={() => setView('generator')}
                  className="bg-black text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-gray-800 transition-colors"
                >
                  Create a recipe
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={filterCuisine}
                      onChange={(e) => setFilterCuisine(e.target.value)}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white"
                    >
                      <option value="All">All Cuisines</option>
                      {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={filterPrepTime}
                      onChange={(e) => setFilterPrepTime(e.target.value)}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white"
                    >
                      <option value="All">All Prep Times</option>
                      <option value="< 30 mins">&lt; 30 mins</option>
                      <option value="< 1 hour">&lt; 1 hour</option>
                      <option value="1 hour+">1 hour+</option>
                    </select>
                    <select
                      value={filterDiet}
                      onChange={(e) => setFilterDiet(e.target.value)}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white"
                    >
                      <option value="All">All Diets</option>
                      {DIETARY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                
                {filteredSavedRecipes.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No recipes found in this category.
                  </div>
                ) : (
                  <div className="grid gap-8">
                    {filteredSavedRecipes.map(savedRecipe => (
                      <RecipeCard 
                        key={savedRecipe.id}
                        recipe={savedRecipe}
                        isSaved={true}
                        onSave={() => toggleSaveRecipe(savedRecipe)}
                        onSwapDiet={(diet) => swapDiet(savedRecipe, diet)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  isSaved, 
  onSave, 
  onSwapDiet
}: { 
  recipe: Recipe; 
  isSaved: boolean; 
  onSave: () => void;
  onSwapDiet?: (diet: string) => void;
}) {
  const [showSwapMenu, setShowSwapMenu] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [convertedIngredients, setConvertedIngredients] = useState<Record<number, Ingredient>>({});
  const [isCookAlong, setIsCookAlong] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [reviews, setReviews] = useState<Review[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`reviews_${recipe.id}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse reviews');
        }
      }
    }
    return [];
  });
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    if (isCookAlong && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(recipe.instructions[currentStep]);
      window.speechSynthesis.speak(utterance);
    }
  }, [isCookAlong, currentStep, recipe.instructions]);

  const parseQuantity = (q: string): number => {
    if (!q) return 0;
    // Handle fractions like "1/2"
    if (q.includes('/')) {
      const [num, den] = q.split('/').map(Number);
      return num / den;
    }
    // Handle mixed fractions like "1 1/2"
    if (q.includes(' ')) {
      const parts = q.split(' ');
      return Number(parts[0]) + parseQuantity(parts[1]);
    }
    return Number(q);
  };

  const formatQuantity = (q: number): string => {
    if (q % 1 === 0) return q.toString();
    return q.toFixed(1);
  };

  const handleConvert = async (idx: number, ing: Ingredient) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Configuration Error: NEXT_PUBLIC_GEMINI_API_KEY is missing.");
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Convert ${ing.quantity} ${ing.unit} of ${ing.item} to cups. Return ONLY the new quantity and unit in JSON format { "quantity": "...", "unit": "..." }. If conversion is not possible, return { "quantity": "${ing.quantity}", "unit": "${ing.unit}" }.`
    });
    
    if (response.text) {
      try {
        const result = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, ''));
        setConvertedIngredients(prev => ({
          ...prev,
          [idx]: { ...ing, quantity: result.quantity, unit: result.unit }
        }));
      } catch (e) {
        console.error('Failed to parse conversion result', e);
      }
    }
  };

  const handleSubmitReview = () => {
    if (rating === 0) return;
    const newReview: Review = {
      id: crypto.randomUUID(),
      recipeId: recipe.id,
      rating,
      text: reviewText.trim(),
      date: new Date().toISOString(),
    };
    const updated = [...reviews, newReview];
    setReviews(updated);
    localStorage.setItem(`reviews_${recipe.id}`, JSON.stringify(updated));
    setRating(0);
    setReviewText('');
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleShare = async () => {
    if (!recipe) return;
    
    try {
      const docRef = await addDoc(collection(db, 'recipes'), {
        ...recipe,
        authorUid: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      
      const shareUrl = `${window.location.origin}/?recipeId=${docRef.id}`;
      const shareText = `Check out this recipe for ${recipe.title}!\n\n${shareUrl}\n\nGenerated via What's In?.`;
      
      if (navigator.share) {
        await navigator.share({
          title: recipe.title,
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Recipe link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      alert("Failed to share recipe.");
    }
  };

  return (
    <div className="w-full bg-stone-50 rounded-2xl p-6 sm:p-10 shadow-md border border-stone-200 overflow-hidden relative">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-4 mb-6">
        <div className="w-full max-w-full">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 text-stone-900 leading-tight">
            {recipe.title}
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed mb-4">
            {recipe.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => setIsCookAlong(!isCookAlong)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isCookAlong ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'}`}
            >
              {isCookAlong ? 'Exit Cook Along' : 'Start Cook Along'}
            </button>
            <button 
              onClick={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
              className="px-4 py-2 rounded-full text-sm font-medium bg-stone-200 text-stone-700 hover:bg-stone-300"
            >
              Switch to {unitSystem === 'metric' ? 'Imperial' : 'Metric'}
            </button>
          </div>
          {isCookAlong ? (
            <div className="mt-6 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Step {currentStep + 1} of {recipe.instructions.length}</h3>
              <p className="text-lg mb-6">{recipe.instructions[currentStep]}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="px-4 py-2 rounded-lg bg-stone-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentStep(Math.min(recipe.instructions.length - 1, currentStep + 1))}
                  disabled={currentStep === recipe.instructions.length - 1}
                  className="px-4 py-2 rounded-lg bg-stone-800 text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <>
              {recipe.note && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm italic">
                  Note: {recipe.note}
                </div>
              )}
              {recipe.substitutionImpact && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-xl text-purple-800 text-sm">
                  <span className="font-semibold">Substitution Impact:</span> {recipe.substitutionImpact}
                </div>
              )}
              {recipe.nutritionalComparison && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                  <span className="font-semibold">Nutritional Comparison:</span> {recipe.nutritionalComparison}
                </div>
              )}
            </>
          )}
          {recipe.categories && recipe.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.categories.map(cat => (
                <span key={cat} className="px-3 py-1 bg-stone-200 text-stone-700 text-xs font-medium rounded-full">
                  {cat}
                </span>
              ))}
            </div>
          )}
          {averageRating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center text-amber-500">
                <Star className="fill-current w-5 h-5" />
                <span className="ml-1.5 text-lg font-medium text-stone-900">{averageRating}</span>
              </div>
              <span className="text-stone-500 text-sm">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2 w-full sm:w-auto justify-end order-first sm:order-none mb-2 sm:mb-0">
          {onSwapDiet && (
            <div className="relative">
              <button 
                onClick={() => setShowSwapMenu(!showSwapMenu)}
                className="p-3 rounded-full flex-shrink-0 transition-colors bg-stone-200 text-stone-700 hover:bg-stone-300"
                title="Diet Swap Mode"
              >
                <RefreshCw size={24} />
              </button>
              {showSwapMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-100 py-2 z-10">
                  <div className="px-4 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">Swap Diet To:</div>
                  {['Vegan', 'Gluten-Free', 'High-Protein', 'Keto', 'Paleo'].map(diet => (
                    <button
                      key={diet}
                      onClick={() => {
                        setShowSwapMenu(false);
                        onSwapDiet(diet);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button 
            onClick={handleShare}
            className="p-3 rounded-full flex-shrink-0 transition-colors bg-stone-200 text-stone-700 hover:bg-stone-300"
            title="Share recipe"
          >
            <Share2 size={24} />
          </button>
          <button 
            onClick={onSave}
            className={`p-3 rounded-full flex-shrink-0 transition-colors ${
              isSaved ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
            title={isSaved ? "Remove from saved" : "Save recipe"}
          >
            {isSaved ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Prep Time</span>
          <span className="font-medium text-stone-900">{recipe.prepTime}</span>
        </div>
        <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Cook Time</span>
          <span className="font-medium text-stone-900">{recipe.cookTime}</span>
        </div>
        {recipe.nutrition && (
          <div className="w-full space-y-4 mt-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Nutrient Breakdown</h4>
            <div className="flex flex-wrap gap-4">
              <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Calories</span>
                <span className="font-medium text-stone-900">{recipe.nutrition.calories}</span>
              </div>
              <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Protein</span>
                <span className="font-medium text-stone-900">{recipe.nutrition.protein}</span>
              </div>
              <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Fat</span>
                <span className="font-medium text-stone-900">{recipe.nutrition.fat}</span>
              </div>
              <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">Carbs</span>
                <span className="font-medium text-stone-900">{recipe.nutrition.carbs}</span>
              </div>
            </div>
            <NutrientVisualizer nutrition={recipe.nutrition} />
          </div>
        )}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="w-full mt-4 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <h4 className="text-lg font-semibold text-emerald-900 mb-4">Chef's Tips</h4>
            <ul className="list-disc list-inside space-y-2 text-emerald-800 text-sm">
              {recipe.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        {recipe.variations && recipe.variations.length > 0 && (
          <div className="w-full mt-4 p-6 bg-sky-50 border border-sky-100 rounded-2xl">
            <h4 className="text-lg font-semibold text-sky-900 mb-4">Recipe Variations</h4>
            <div className="space-y-4">
              {recipe.variations.map((variation, idx) => (
                <div key={idx}>
                  <p className="font-semibold text-sky-900">{variation.name}</p>
                  <p className="text-sky-800 text-sm">{variation.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              Ingredients
            </h3>
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
              {[0.5, 1, 2, 4].map(m => (
                <button
                  key={m}
                  onClick={() => setServingMultiplier(m)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${servingMultiplier === m ? 'bg-white shadow-sm' : 'text-stone-500'}`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, idx) => {
              const baseIng = convertedIngredients[idx] || ing;
              const displayIng = unitSystem === 'metric' ? baseIng : (() => {
                if (baseIng.unit === 'g' || baseIng.unit === 'grams') return { ...baseIng, quantity: (Number(baseIng.quantity) / 28.35).toFixed(1), unit: 'oz' };
                if (baseIng.unit === 'ml') return { ...baseIng, quantity: (Number(baseIng.quantity) / 29.57).toFixed(1), unit: 'fl oz' };
                return baseIng;
              })();
              const baseQty = parseQuantity(displayIng.quantity);
              const scaledQty = baseQty * servingMultiplier;
              return (
                <li key={idx} className="flex items-start justify-between gap-3 text-stone-700">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-900 mt-2.5 flex-shrink-0" />
                    <span className="leading-relaxed">
                      <span className="font-semibold">{formatQuantity(scaledQty)} {displayIng.unit}</span> {displayIng.item}
                    </span>
                  </div>
                  {(baseIng.unit.toLowerCase() === 'g' || baseIng.unit.toLowerCase() === 'grams' || baseIng.unit.toLowerCase() === 'ml') && (
                    <button 
                      onClick={() => {
                        if (convertedIngredients[idx]) {
                          setConvertedIngredients(prev => {
                            const next = { ...prev };
                            delete next[idx];
                            return next;
                          });
                        } else {
                          handleConvert(idx, baseIng);
                        }
                      }}
                      className="text-xs text-stone-500 underline hover:text-stone-800"
                    >
                      {convertedIngredients[idx] ? 'Reset' : 'Convert'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Instructions
          </h3>
          <div className="space-y-8">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex gap-5">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-gray-700 leading-relaxed pt-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12 pt-10 border-t border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-semibold tracking-tight">Reviews</h3>
        </div>

        {/* Write a review */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
          <h4 className="font-medium text-gray-900 mb-4">Leave a review</h4>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
              >
                <Star 
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  } transition-colors`} 
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="What did you think of this recipe? (Optional)"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm mb-4 min-h-[100px] resize-y"
          />
          <button
            onClick={handleSubmitReview}
            disabled={rating === 0}
            className="bg-black text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Review
          </button>
        </div>

        {/* Review List */}
        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                {review.text && (
                  <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
