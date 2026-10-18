import type { Food } from '../types';

// Approximate values per stated serving. Good enough for coaching-level tracking.
type Row = [name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number];

const rows: Row[] = [
  // Protein
  ['Chicken breast, cooked', '100 g', 165, 31, 0, 3.6],
  ['Chicken thigh, cooked', '100 g', 209, 26, 0, 10.9],
  ['Lean beef mince 5%, cooked', '100 g', 174, 26, 0, 7.5],
  ['Sirloin steak, cooked', '100 g', 206, 29, 0, 9.5],
  ['Salmon fillet, cooked', '100 g', 208, 22, 0, 13],
  ['Tuna, canned in water', '1 can (120 g)', 132, 29, 0, 1],
  ['White fish, cooked', '100 g', 105, 23, 0, 1],
  ['Prawns, cooked', '100 g', 99, 24, 0.2, 0.3],
  ['Pork loin, cooked', '100 g', 242, 27, 0, 14],
  ['Turkey breast, sliced', '100 g', 104, 24, 0, 0.7],
  ['Whole egg', '1 large', 72, 6.3, 0.4, 4.8],
  ['Egg whites', '100 g', 52, 11, 0.7, 0.2],
  ['Firm tofu', '100 g', 144, 17, 3, 9],
  ['Tempeh', '100 g', 192, 20, 7.6, 11],
  ['Whey protein', '1 scoop (30 g)', 120, 24, 3, 1.5],
  ['Greek yoghurt 0%', '170 g', 100, 18, 6, 0.7],
  ['Cottage cheese', '100 g', 98, 11, 3.4, 4.3],
  ['Protein bar', '1 bar (60 g)', 220, 20, 22, 7],

  // Carbs
  ['White rice, cooked', '1 cup (160 g)', 205, 4.3, 45, 0.4],
  ['Brown rice, cooked', '1 cup (195 g)', 216, 5, 45, 1.8],
  ['Oats, dry', '40 g', 150, 5.3, 27, 2.6],
  ['Wholemeal bread', '1 slice', 80, 4, 14, 1],
  ['White bread', '1 slice', 75, 2.6, 14, 1],
  ['Pasta, cooked', '1 cup (140 g)', 220, 8, 43, 1.3],
  ['Egg noodles, cooked', '1 cup (160 g)', 221, 7.3, 40, 3.3],
  ['Sweet potato, baked', '150 g', 135, 3, 31, 0.2],
  ['Potato, boiled', '150 g', 130, 2.9, 30, 0.2],
  ['Quinoa, cooked', '1 cup (185 g)', 222, 8, 39, 3.6],
  ['Bagel', '1 medium', 245, 10, 48, 1.5],
  ['Wrap / tortilla', '1 large', 210, 6, 35, 5],
  ['Granola', '50 g', 230, 5, 32, 9],
  ['Rice cakes', '2 cakes', 70, 1.4, 15, 0.5],

  // Fruit & veg
  ['Banana', '1 medium', 105, 1.3, 27, 0.4],
  ['Apple', '1 medium', 95, 0.5, 25, 0.3],
  ['Orange', '1 medium', 62, 1.2, 15, 0.2],
  ['Blueberries', '1 cup (150 g)', 85, 1.1, 21, 0.5],
  ['Strawberries', '1 cup (150 g)', 48, 1, 11.5, 0.5],
  ['Mango', '1 cup (165 g)', 99, 1.4, 25, 0.6],
  ['Broccoli', '100 g', 35, 2.4, 7, 0.4],
  ['Mixed salad leaves', '1 bowl (80 g)', 15, 1.2, 2.5, 0.2],
  ['Spinach', '100 g', 23, 2.9, 3.6, 0.4],
  ['Mixed vegetables, stir-fried', '1 cup', 90, 3, 12, 4],
  ['Avocado', '½ fruit', 120, 1.5, 6, 11],

  // Fats & dairy
  ['Olive oil', '1 tbsp', 119, 0, 0, 13.5],
  ['Butter', '10 g', 72, 0.1, 0, 8.1],
  ['Peanut butter', '1 tbsp (16 g)', 94, 3.5, 3.5, 8],
  ['Almonds', '30 g', 174, 6.4, 6, 15],
  ['Mixed nuts', '30 g', 180, 5, 6, 16],
  ['Cheddar cheese', '30 g', 121, 7.5, 0.4, 10],
  ['Milk, full cream', '250 ml', 160, 8, 12, 9],
  ['Milk, skim', '250 ml', 85, 8.5, 12, 0.2],
  ['Oat milk', '250 ml', 120, 3, 16, 5],
  ['Dark chocolate 70%', '20 g', 120, 1.6, 9, 8.5],

  // Meals
  ['Chicken rice (steamed)', '1 plate', 600, 28, 75, 20],
  ['Nasi lemak with chicken', '1 plate', 800, 30, 85, 38],
  ['Fried rice', '1 plate', 650, 18, 85, 25],
  ['Pad thai', '1 plate', 700, 25, 90, 26],
  ['Chicken burrito bowl', '1 bowl', 650, 40, 70, 20],
  ['Poke bowl, salmon', '1 bowl', 600, 30, 70, 20],
  ['Sushi roll', '8 pieces', 350, 12, 60, 6],
  ['Beef burger', '1 burger', 550, 28, 40, 30],
  ['Pizza, margherita', '2 slices', 500, 20, 60, 18],
  ['Caesar salad with chicken', '1 bowl', 480, 35, 15, 30],
  ['Roti prata', '1 piece', 210, 4, 28, 9],
  ['Wonton noodle soup', '1 bowl', 420, 22, 55, 12],

  // Drinks & snacks
  ['Black coffee', '1 cup', 2, 0.3, 0, 0],
  ['Latte, full cream', '1 regular', 190, 10, 15, 10],
  ['Kopi / teh with condensed milk', '1 cup', 120, 2, 20, 3.5],
  ['Orange juice', '250 ml', 110, 1.7, 26, 0.5],
  ['Sports drink', '500 ml', 130, 0, 34, 0],
  ['Beer', '1 can (330 ml)', 145, 1.6, 12, 0],
  ['Red wine', '1 glass (150 ml)', 125, 0.1, 3.8, 0],
  ['Potato chips', '30 g', 160, 2, 15, 10],
  ['Ice cream', '1 scoop (65 g)', 140, 2.5, 16, 7.5],
];

export const FOODS: Food[] = rows.map(([name, serving, calories, protein, carbs, fat], i) => ({
  id: `f${i + 1}`,
  name,
  serving,
  calories,
  protein,
  carbs,
  fat,
}));
