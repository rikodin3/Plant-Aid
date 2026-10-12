import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen,
  Sprout,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  Search,
  Eye,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import ExpandableProfileCard from '../components/watermelon/original';

interface DiseaseGuideEntry {
  slug: string;
  name: string;
  localName: string;
  scientificName: string;
  category: 'Fungal Spot' | 'Fungal Rust' | 'Soil & Nutrition' | 'Healthy Foliage';
  severity: 'High Spread' | 'Moderate Spread' | 'Early Stage' | 'Nutritional' | 'Healthy & Optimal';
  badgeVariant: 'warning' | 'destructive' | 'info' | 'optimal' | 'default';
  image: string;
  simpleSummary: string;
  quickCheck: string;
  whenToAct: string;
  symptoms: string[];
  organicRemedies: {
    name: string;
    dosage: string;
    instruction: string;
  }[];
  chemicalRemedies: {
    name: string;
    dosage: string;
    instruction: string;
  }[];
  culturalRemedies: {
    name: string;
    instruction: string;
  }[];
}

const CATALOGUE: DiseaseGuideEntry[] = [
  {
    slug: 'early_leaf_spot',
    name: 'Early Leaf Spot',
    localName: 'Early Tikka Disease',
    scientificName: 'Cercospora arachidicola',
    category: 'Fungal Spot',
    severity: 'Moderate Spread',
    badgeVariant: 'warning',
    image: '/images/diseases/early_leaf_spot.jpg',
    simpleSummary:
      'Dark brown spots with bright yellow rings around them. Usually appears early in the crop cycle (3 to 4 weeks after sowing) on lower leaves.',
    quickCheck: 'Look for brown spots that have a clear bright yellow halo ring around each spot.',
    whenToAct: 'Act within 48 hours of spotting first leaf marks on bottom foliage.',
    symptoms: [
      'Circular brown or reddish-brown spots on the upper side of leaves.',
      'A distinct bright yellow halo ring clearly surrounding each brown spot.',
      'Starts on lower leaves close to the ground and gradually moves upward.',
      'Infected leaves turn yellow and fall off early, reducing pod yield if not managed.',
    ],
    organicRemedies: [
      {
        name: 'Trichoderma Bio-Fungicide (Friendly Fungi)',
        dosage: '5 grams per 1 Litre of clean water (approx. 500g per 100L tank)',
        instruction:
          'Spray thoroughly on leaf tops and bottoms early in the morning. Friendly fungi multiply on leaves and block disease spores.',
      },
      {
        name: 'Neem Seed Kernel Extract (5% NSKE)',
        dosage: '50 ml per 1 Litre of water (or 500ml per 10L bucket)',
        instruction:
          'Herbal protective spray that stops fungus spores from germinating. Spray every 10–12 days during cloudy or damp weather.',
      },
    ],
    chemicalRemedies: [
      {
        name: 'Mancozeb 75% WP (Contact Shield)',
        dosage: '2 grams per 1 Litre of water (approx. 400 grams per acre)',
        instruction:
          'Protective contact spray. Coats healthy leaves so spores cannot enter. Repeat after 14 days if wet rains continue.',
      },
      {
        name: 'Chlorothalonil 75% WP',
        dosage: '2 grams per 1 Litre of water',
        instruction:
          'Broad-spectrum fungicide that halts disease germination across foliage.',
      },
    ],
    culturalRemedies: [
      {
        name: 'Crop Rotation with Cereals',
        instruction:
          'Rotate your field with pearl millet (bajra), maize, or sorghum for 2 seasons to starve fungal spores left in the soil.',
      },
      {
        name: 'Clear Old Crop Waste',
        instruction:
          'Deep plough or compost dried crop stems and leaves after harvest to break the disease cycle.',
      },
    ],
  },
  {
    slug: 'late_leaf_spot',
    name: 'Late Leaf Spot',
    localName: 'Late Tikka Disease',
    scientificName: 'Phaeoisariopsis personata',
    category: 'Fungal Spot',
    severity: 'High Spread',
    badgeVariant: 'destructive',
    image: '/images/diseases/late_leaf_spot.jpg',
    simpleSummary:
      'Dark brown or almost black spots with no yellow rings. Appears later in the season (50 to 60 days after sowing) and causes heavy leaf shedding.',
    quickCheck: 'Nearly black spots with black powdery soot on the underside, without yellow halos.',
    whenToAct: 'High danger of fast defoliation; spray immediately upon first detection.',
    symptoms: [
      'Dark brown to pitch-black circular spots on both sides of the leaf.',
      'No yellow halo ring around the spots (this is how you tell it apart from Early Leaf Spot).',
      'The underside of the spot has a dark velvety soot of fungal spores.',
      'Leaves shed rapidly from lower to upper canopy, leaving bare stems.',
    ],
    organicRemedies: [
      {
        name: 'Pseudomonas fluorescens (Bio-Bacterial Spray)',
        dosage: '10 grams per 1 Litre of water',
        instruction:
          'Beneficial bacteria that shields foliage, outcompetes harmful fungal spores, and boosts plant defenses.',
      },
    ],
    chemicalRemedies: [
      {
        name: 'Tebuconazole 25.9% EC (Systemic Healer)',
        dosage: '1.25 ml per 1 Litre of water (approx. 250 ml per acre)',
        instruction:
          'Absorbs directly into plant sap to heal active spots and protect new leaves from within.',
      },
      {
        name: 'Carbendazim + Mancozeb Combo (Saaf / Sixer)',
        dosage: '1.5 grams per 1 Litre of water',
        instruction:
          'Dual-action contact and systemic fungicide. Ideal for stubborn or fast-advancing outbreaks.',
      },
    ],
    culturalRemedies: [
      {
        name: 'Proper Plant Spacing',
        instruction:
          'Maintain 30 cm between rows and 10 cm between plants so sunlight and fresh breeze can reach lower foliage and keep leaves dry.',
      },
      {
        name: 'Avoid Evening Sprinkler Irrigation',
        instruction:
          'Do not leave plant leaves wet overnight. Use furrow or drip irrigation during humid weather.',
      },
    ],
  },
  {
    slug: 'rust',
    name: 'Groundnut Rust',
    localName: 'Gerua / Tambera Disease',
    scientificName: 'Puccinia arachidis Speg.',
    category: 'Fungal Rust',
    severity: 'High Spread',
    badgeVariant: 'destructive',
    image: '/images/diseases/rust.jpg',
    simpleSummary:
      'Orange-brown powdery blisters on the underside of leaves. Leaves curl, dry up, and look scorched or burnt, but remain attached to the stem.',
    quickCheck: 'Raised blisters under leaves that leave rust-brown powder on your fingers when touched.',
    whenToAct: 'Rust spreads fast in wind; spray at first sight of clustered blisters.',
    symptoms: [
      'Small raised blisters (pustules) packed with orange-brown powder on the bottom of leaves.',
      'Faint yellow spots on the upper leaf surface directly above the blisters.',
      'When you rub your fingers on the leaf bottom, reddish-brown dust comes off.',
      'Badly infected leaves curl up, turn brittle, and look burnt or scorched, but stay attached.',
    ],
    organicRemedies: [
      {
        name: 'Garlic-Chili Herbal Spray',
        dosage: '20 ml per 1 Litre of water',
        instruction:
          'Sulfur-rich natural botanical extract that repels pests and prevents rust spores from germinating on leaves.',
      },
    ],
    chemicalRemedies: [
      {
        name: 'Hexaconazole 5% EC (Fast Knockdown)',
        dosage: '2 ml per 1 Litre of water (approx. 400 ml per acre)',
        instruction:
          'Fast systemic fungicide that halts spore growth and knocks down active rust pustules within 48 hours.',
      },
      {
        name: 'Wettable Sulfur 80% WP (Sulfex)',
        dosage: '3 grams per 1 Litre of water',
        instruction:
          'Cost-effective protective sulfur wash. Avoid spraying during extreme hot sunny afternoons (above 38°C).',
      },
    ],
    culturalRemedies: [
      {
        name: 'Intercropping with Cereals',
        instruction:
          'Plant 1 row of pearl millet (bajra) or pigeon pea for every 3 rows of groundnut. Tall cereals block wind-blown spores.',
      },
      {
        name: 'Remove Stray Groundnut Seedlings',
        instruction:
          'Uproot self-sown groundnut seedlings along field borders that harbor rust between seasons.',
      },
    ],
  },
  {
    slug: 'early_rust',
    name: 'Early Rust Pustules',
    localName: 'Early Rust Warning',
    scientificName: 'Puccinia arachidis (Initial Stage)',
    category: 'Fungal Rust',
    severity: 'Early Stage',
    badgeVariant: 'warning',
    image: '/images/diseases/early_rust.jpg',
    simpleSummary:
      'The very first stage of rust disease. A few tiny pin-sized orange dots start appearing on the lower leaves. Catching it here makes treatment quick and affordable.',
    quickCheck: 'Scattered tiny orange-brown pinpricks on bottom leaves with no scorched patches yet.',
    whenToAct: 'Best window to stop rust before it spreads to neighboring rows.',
    symptoms: [
      'Tiny, scattered orange-brown specks on the underside of lower leaves.',
      'Light yellow pinpricks visible on the top surface of the leaf.',
      'Leaves are still green and flexible with no curling or scorching yet.',
    ],
    organicRemedies: [
      {
        name: 'Trichoderma Bio-Fungicide Spray',
        dosage: '5 grams per 1 Litre of water',
        instruction:
          'Foliar spray to populate leaf surfaces with friendly microbes before rust spores multiply.',
      },
    ],
    chemicalRemedies: [
      {
        name: 'Mancozeb 75% WP (Protective Shield)',
        dosage: '2 grams per 1 Litre of water',
        instruction:
          'Protective contact spray that covers leaves and prevents young rust specks from growing into big pustules.',
      },
    ],
    culturalRemedies: [
      {
        name: 'Twice-Weekly Field Walks',
        instruction:
          'Walk field diagonals twice a week during rainy or misty periods to check lower leaf bottoms.',
      },
      {
        name: 'Balanced Fertilizer (Avoid Excess Urea)',
        instruction:
          'Do not over-apply nitrogen/urea fertilizer, as soft excessive foliage makes leaves extra prone to rust.',
      },
    ],
  },
  {
    slug: 'nutrition_deficiency',
    name: 'Nutritional Chlorosis',
    localName: 'Iron / Zinc Yellowing (Not a Fungus)',
    scientificName: 'Abiotic Micronutrient Stress',
    category: 'Soil & Nutrition',
    severity: 'Nutritional',
    badgeVariant: 'info',
    image: '/images/diseases/nutrition_deficiency.jpg',
    simpleSummary:
      'Leaves turn pale yellow between the leaf veins while the veins stay green. This is caused by soil nutrients (iron or zinc), not by a fungus or insect.',
    quickCheck: 'Yellow leaf tissue with crisp green leaf veins (stripes or net pattern).',
    whenToAct: 'Apply foliar spray when new top leaves turn pale or yellowish.',
    symptoms: [
      'Young tender leaves turn pale lime-green or bright yellow between the veins.',
      'The leaf veins remain darker green, creating a distinctive striped or net-like look.',
      'Stunted plant growth, smaller leaves, and thin stems.',
      'Common in chalky / high-lime soils, sandy fields, or waterlogged roots that cannot drink nutrients.',
    ],
    organicRemedies: [
      {
        name: 'Well-Composted Farm Yard Manure (FYM)',
        dosage: '10–12 tonnes (cartloads) per hectare',
        instruction:
          'Mix well into soil during field preparation. Increases organic carbon so plant roots can absorb minerals naturally.',
      },
    ],
    chemicalRemedies: [
      {
        name: 'Ferrous Sulfate + Citric Acid (Iron Foliar Spray)',
        dosage: '5 grams Ferrous Sulfate + 1 gram Citric Acid (Nimbu Sat) per 1 Litre of water',
        instruction:
          'Foliar spray twice, 10 days apart. Citric acid helps leaves absorb iron directly within 48 to 72 hours.',
      },
      {
        name: 'Chelated Zinc (Zinc-EDTA 12%)',
        dosage: '1 gram per 1 Litre of water',
        instruction:
          'Foliar spray if yellowing is accompanied by small leaves (little-leaf symptom) in red sandy soils.',
      },
    ],
    culturalRemedies: [
      {
        name: 'Improve Field Drainage Channels',
        instruction:
          'Dig drainage furrows so water does not pool in the field. Waterlogged roots suffocate and stop absorbing iron.',
      },
      {
        name: 'Apply Gypsum at Flowering',
        instruction:
          'Apply 200 kg gypsum per acre during flowering/pegging to give sulfur and calcium for strong pod development.',
      },
    ],
  },
  {
    slug: 'healthy_leaf',
    name: 'Healthy Groundnut Foliage',
    localName: 'Healthy Crop Baseline',
    scientificName: 'Arachis hypogaea L.',
    category: 'Healthy Foliage',
    severity: 'Healthy & Optimal',
    badgeVariant: 'optimal',
    image: '/images/diseases/healthy_leaf.jpg',
    simpleSummary:
      'Deep, rich green leaves with clean surfaces and strong stems. Zero spots, yellowing rings, or rust blisters. This is your target benchmark.',
    quickCheck: 'Uniform vibrant green color, glossy leaves, and robust foliage with zero lesions.',
    whenToAct: 'Continue routine weekly checks and regular balanced irrigation.',
    symptoms: [
      'Even, vibrant deep green color across all four leaflets.',
      'Clean leaf margins with no spots, blisters, or yellow rings.',
      'Firm stems and active, healthy canopy growth.',
      'Normal flowering and smooth pegs pushing into the soil.',
    ],
    organicRemedies: [
      {
        name: 'Rhizobium Bio-Fertilizer (Root Nodule Boost)',
        dosage: 'Seed treatment or liquid root drench',
        instruction:
          'Forms healthy pink nodules on groundnut roots that naturally capture free nitrogen from the atmosphere.',
      },
    ],
    chemicalRemedies: [],
    culturalRemedies: [
      {
        name: 'Weekly Field Audits',
        instruction:
          'Walk through your field once a week to catch any isolated spots before they spread to nearby rows.',
      },
      {
        name: 'Balanced Watering Schedule',
        instruction:
          'Water crops every 10–14 days based on soil moisture, especially during flowering and pod development.',
      },
    ],
  },
];

export const DiseaseGuidePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSlug = searchParams.get('disease');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'Fungal Spot',
    'Fungal Rust',
    'Soil & Nutrition',
    'Healthy Foliage',
  ];

  const filteredCatalogue = CATALOGUE.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    return (
      matchesCategory &&
      (item.name.toLowerCase().includes(query) ||
        item.localName.toLowerCase().includes(query) ||
        item.scientificName.toLowerCase().includes(query) ||
        item.simpleSummary.toLowerCase().includes(query) ||
        item.quickCheck.toLowerCase().includes(query) ||
        item.symptoms.some((s) => s.toLowerCase().includes(query)) ||
        item.organicRemedies.some(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.instruction.toLowerCase().includes(query)
        ) ||
        item.chemicalRemedies.some(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.instruction.toLowerCase().includes(query)
        ))
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-transparent pt-3 pb-24 sm:py-8 sm:pb-12 px-3.5 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-3.5 sm:space-y-6">
        {/* Unified Editorial Console Header */}
        <Surface className="p-3.5 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-6 pb-3 sm:pb-6 border-b border-emerald-950/10">
            <div className="space-y-1 sm:space-y-2 max-w-2xl">
              <h1 className="text-xl sm:text-3xl font-normal text-slate-900 tracking-tight leading-tight">
                Groundnut Pathology &amp; Treatment Guide
              </h1>
              <p className="hidden sm:block text-slate-600 text-sm leading-relaxed">
                Farmer-tested visual symptoms, photorealistic specimen photos, natural bio-fungicides, chemical dosages, and soil care.
              </p>
            </div>
          </div>

          {/* Search & Category Filter Strip */}
          <div className="pt-3 sm:pt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symptoms or remedies..."
                className="w-full min-h-[42px] sm:min-h-[44px] pl-9 pr-10 py-2 rounded-xl border border-emerald-950/10 bg-white/90 sm:bg-white/75 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 touch-target cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[38px] sm:min-h-[40px] touch-target cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-agri-800 text-white shadow-xs'
                      : 'bg-white/85 sm:bg-white/70 text-slate-700 hover:bg-white/95 border border-emerald-950/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </Surface>

        {filteredCatalogue.length === 0 ? (
          <Surface className="py-12 sm:py-16 text-center space-y-3">
            <Search className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">No Matching Diseases</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Try searching for a different symptom, remedy, or switch category filters.
            </p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {filteredCatalogue.map((disease) => (
              <ExpandableProfileCard
                key={disease.slug}
                id={`guide-card-${disease.slug}`}
                imageSrc={disease.image}
                title={disease.name}
                subtitle={`${disease.localName} • ${disease.scientificName}`}
                defaultOpen={selectedSlug === disease.slug}
                onClose={() => {
                  if (selectedSlug === disease.slug) {
                    setSearchParams({}, { replace: true });
                  }
                }}
                badge={
                  <Badge variant={disease.badgeVariant} className="shadow-xs">
                    {disease.severity}
                  </Badge>
                }
                content={
                  <div className="space-y-5">
                    {/* Quick Identification */}
                    <div className="p-4 rounded-2xl bg-emerald-950/5 border border-emerald-950/10 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-agri-800">
                        Quick Identification
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {disease.quickCheck}
                      </p>
                      <div className="pt-1 text-xs font-semibold text-emerald-800 flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                        <span>Action: {disease.whenToAct}</span>
                      </div>
                    </div>

                    {/* Diagnostic Symptoms */}
                    <div>
                      <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-agri-700 shrink-0" />
                        <span>Diagnostic Symptoms</span>
                      </h4>
                      <ul className="space-y-2">
                        {disease.symptoms.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-agri-600 shrink-0 mt-2" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bio-Organic Remedies */}
                    {disease.organicRemedies.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Bio-Organic Treatment</span>
                        </h4>
                        {disease.organicRemedies.map((r, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-white/80 border border-emerald-950/10 space-y-1.5">
                            <div className="text-sm font-bold text-slate-900 leading-snug">{r.name}</div>
                            <div className="text-xs text-emerald-900 font-bold bg-emerald-100/80 border border-emerald-200/70 px-2.5 py-1 rounded-lg inline-block">
                              Dosage: {r.dosage}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{r.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chemical Shield */}
                    {disease.chemicalRemedies.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <FlaskConical className="w-4 h-4 text-agri-700 shrink-0" />
                          <span>Protective Chemical Shield</span>
                        </h4>
                        {disease.chemicalRemedies.map((r, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-white/80 border border-emerald-950/10 space-y-1.5">
                            <div className="text-sm font-bold text-slate-900 leading-snug">{r.name}</div>
                            <div className="text-xs text-agri-900 font-bold bg-agri-100/80 border border-emerald-950/10 px-2.5 py-1 rounded-lg inline-block">
                              Dosage: {r.dosage}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{r.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cultural & Soil Care */}
                    {disease.culturalRemedies.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-agri-700 shrink-0" />
                          <span>Field &amp; Soil Management</span>
                        </h4>
                        {disease.culturalRemedies.map((r, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-white/80 border border-emerald-950/10 space-y-1.5">
                            <div className="text-sm font-bold text-slate-900 leading-snug">{r.name}</div>
                            <p className="text-sm text-slate-600 leading-relaxed">{r.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DiseaseGuidePage;
