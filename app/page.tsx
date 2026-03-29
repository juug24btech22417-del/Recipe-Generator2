'use client';
import { useState } from 'react';
import RecipeApp from '@/components/RecipeApp';
import Chatbot from '@/components/Chatbot';

export default function Home() {
  const [chefPersonality, setChefPersonality] = useState('Strict Chef');

  return (
    <main className="min-h-screen bg-[#f5f5f0]">
      <RecipeApp chefPersonality={chefPersonality} setChefPersonality={setChefPersonality} />
      <Chatbot chefPersonality={chefPersonality} />
    </main>
  );
}
