import { useEffect } from 'react';
import { useGameStore } from '@/app/store';
import { useRoute } from '@/app/router';
import { usePrefs } from '@/app/prefs';
import { useAutosave } from '@/app/useAutosave';
import { useAudioSync } from '@/app/useAudioSync';
import { Hud } from '@/components/ui/Hud';
import { BottomNav } from '@/components/ui/BottomNav';
import { Toasts } from '@/components/ui/Toasts';
import { PwaBanners } from '@/pwa/PwaBanners';
import { useInstallStore } from '@/pwa/install';
import { HomeScreen } from '@/app/screens/HomeScreen';
import { StoryScreen } from '@/app/screens/StoryScreen';
import { RestaurantScreen } from '@/app/screens/RestaurantScreen';
import { RecipesScreen } from '@/app/screens/RecipesScreen';
import { ShopScreen } from '@/app/screens/ShopScreen';
import { CollectionScreen } from '@/app/screens/CollectionScreen';
import { EventsScreen } from '@/app/screens/EventsScreen';
import { SettingsScreen } from '@/app/screens/SettingsScreen';
import { GalleryScreen } from '@/app/screens/GalleryScreen';
import { MoreScreen } from '@/app/screens/MoreScreen';
import { KitchenScreen } from '@/app/screens/KitchenScreen';
import { ZenScreen } from '@/app/screens/ZenScreen';
import { DailyScreen } from '@/app/screens/DailyScreen';
import { RushScreen, EndlessScreen, DeliveryScreen } from '@/app/screens/RunScreens';
import { ChefScreen } from '@/app/screens/ChefScreen';
import { PuzzleScreen } from '@/app/screens/PuzzleScreen';
import { MergeScreen } from '@/app/screens/MergeScreen';
import { StudioScreen } from '@/app/screens/StudioScreen';

const screenFor = (path: string) => {
  switch (path) {
    case '/story':
      return <StoryScreen />;
    case '/restaurant':
      return <RestaurantScreen />;
    case '/recipes':
      return <RecipesScreen />;
    case '/shop':
      return <ShopScreen />;
    case '/collection':
      return <CollectionScreen />;
    case '/events':
      return <EventsScreen />;
    case '/settings':
      return <SettingsScreen />;
    case '/gallery':
      return <GalleryScreen />;
    case '/more':
      return <MoreScreen />;
    case '/kitchen':
      return <KitchenScreen />;
    case '/zen':
      return <ZenScreen />;
    case '/daily':
      return <DailyScreen />;
    case '/rush':
      return <RushScreen />;
    case '/endless':
      return <EndlessScreen />;
    case '/delivery':
      return <DeliveryScreen />;
    case '/chef':
      return <ChefScreen />;
    case '/puzzle':
      return <PuzzleScreen />;
    case '/merge':
      return <MergeScreen />;
    case '/studio':
      return <StudioScreen />;
    default:
      return <HomeScreen />;
  }
};

const titles: Record<string, string> = {
  '/': 'Nori Nook - Little Sushi, Big Dreams',
  '/story': 'The Little Sushi Journey - Nori Nook',
  '/restaurant': 'Your Nook - Nori Nook',
  '/recipes': 'Recipe Book - Nori Nook',
  '/shop': 'Nook Supplies - Nori Nook',
  '/collection': 'Collection - Nori Nook',
  '/events': 'Events & Missions - Nori Nook',
  '/settings': 'Settings - Nori Nook',
  '/gallery': 'Photo Gallery - Nori Nook',
  '/more': 'More - Nori Nook',
  '/kitchen': 'Kitchen - Nori Nook',
  '/zen': 'Zen Kitchen - Nori Nook',
  '/daily': 'Daily Special - Nori Nook',
  '/rush': 'Lunch Rush - Nori Nook',
  '/endless': 'Endless Restaurant - Nori Nook',
  '/delivery': 'Delivery Dash - Nori Nook',
  '/chef': 'Chef Challenge - Nori Nook',
  '/puzzle': 'Sushi Puzzle - Nori Nook',
  '/merge': 'Sushi Merge - Nori Nook',
  '/studio': 'Creative Studio - Nori Nook',
};

export const App = () => {
  const path = useRoute();
  const loaded = useGameStore((state) => state.loaded);
  const hydrate = useGameStore((state) => state.hydrate);
  const reducedMotion = usePrefs((state) => state.reducedMotion);
  const initInstall = useInstallStore((state) => state.init);
  const kitchen = path === '/kitchen';

  useEffect(() => {
    void hydrate();
    initInstall();
  }, [hydrate, initInstall]);

  useEffect(() => {
    document.title = titles[path] ?? 'Nori Nook';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [path]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      document.documentElement.dataset.reducedMotion = String(reducedMotion || media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [reducedMotion]);

  useAutosave();
  useAudioSync();

  if (!loaded) {
    return (
      <div className="boot-screen">
        <div className="boot-screen__mark">の</div>
        <h1>Nori Nook</h1>
        <p>Warming the rice, lighting the lantern...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Hud />
      <main className={`app-main ${kitchen ? 'is-play' : 'with-nav'}`}>{screenFor(path)}</main>
      {!kitchen ? <BottomNav /> : null}
      <Toasts />
      <PwaBanners />
    </div>
  );
};
