import basket_icon from './basket_icon.png'
import header_img from './header_img.png'
import search_icon from './search_icon.png'
import menu_1 from './menu_1.png'
import menu_2 from './menu_2.png'
import menu_3 from './menu_3.png'
import menu_4 from './menu_4.png'
import menu_5 from './menu_5.png'
import menu_6 from './menu_6.png'
import menu_7 from './menu_7.png'
import menu_8 from './menu_8.png'

import food_1 from './food_1.png'
import food_2 from './food_2.png'
import food_3 from './food_3.png'
import food_4 from './food_4.png'
import food_5 from './food_5.png'
import food_6 from './food_6.png'
import food_7 from './food_7.png'
import food_8 from './food_8.png'
import food_9 from './food_9.png'
import food_10 from './food_10.png'
import food_11 from './food_11.png'
import food_12 from './food_12.png'
import food_13 from './food_13.png'
import food_14 from './food_14.png'
import food_15 from './food_15.png'
import food_16 from './food_16.png'
import food_17 from './food_17.png'
import food_18 from './food_18.png'
import food_19 from './food_19.png'
import food_20 from './food_20.png'
import food_21 from './food_21.png'
import food_22 from './food_22.png'
import food_23 from './food_23.png'
import food_24 from './food_24.png'
import food_25 from './food_25.png'
import food_26 from './food_26.png'
import food_27 from './food_27.png'
import food_28 from './food_28.png'
import food_29 from './food_29.png'
import food_30 from './food_30.png'
import food_31 from './food_31.png'
import food_32 from './food_32.png'

import add_icon_white from './add_icon_white.png'
import add_icon_green from './add_icon_green.png'
import remove_icon_red from './remove_icon_red.png'
import app_store from './app_store.png'
import play_store from './play_store.png'
import linkedin_icon from './linkedin_icon.png'
import facebook_icon from './facebook_icon.png'
import twitter_icon from './twitter_icon.png'
import cross_icon from './cross_icon.png'
import selector_icon from './selector_icon.png'
import rating_starts from './rating_starts.png'
import profile_icon from './profile_icon.png'
import bag_icon from './bag_icon.png'
import logout_icon from './logout_icon.png'
import parcel_icon from './parcel_icon.png'

const all_food_img = menu_1
const balanced_img = menu_2
const rice_meal_img = menu_2
const protein_drinks_img = menu_3
const high_protein_img = menu_4
const meal_bundles_img = menu_5
const snack_packs_img = menu_6
const fish_meal_img = menu_7
const recovery_img = menu_8
const low_carb_img = menu_7
const muscle_gain_img = menu_7
const weight_loss_img = menu_8

export const category_images = {
    "All Food": all_food_img,
    "Balanced": balanced_img,
    "High Protein": high_protein_img,
    "Muscle Gain": muscle_gain_img,
    "Weight Loss": weight_loss_img,
    "Low Carb": low_carb_img,
    "Breakfast Meals": snack_packs_img,
    "Breakfast Packs": snack_packs_img,
    "Rice Bowls": rice_meal_img,
    "Rice Meals": meal_bundles_img,
    "Chicken Meals": high_protein_img,
    "Beef Meals": muscle_gain_img,
    "Fish Meals": fish_meal_img,
    "Vegetarian Meals": weight_loss_img,
    "Healthy Snacks": snack_packs_img,
    "Snacks": snack_packs_img,
    "Snack Packs": snack_packs_img,
    "Recovery": recovery_img,
    "Recovery Meals": recovery_img,
    "Recovery Packs": recovery_img,
    "Protein Drinks": protein_drinks_img,
    "Drinks": protein_drinks_img,
    "Drink Mixes": protein_drinks_img,
    "Meal Bundles": meal_bundles_img,
};

// Small shared icon/image map used by components like Navbar, Cart, and Footer.
export const assets = {
    basket_icon,
    header_img,
    search_icon,
    rating_starts,
    add_icon_green,
    add_icon_white,
    remove_icon_red,
    app_store,
    play_store,
    linkedin_icon,
    facebook_icon,
    twitter_icon,
    cross_icon,
    selector_icon,
    profile_icon,
    logout_icon,
    bag_icon,
    parcel_icon
}

// Menu categories used by ExploreMenu on the home page.
export const menu_list = [
    {
        menu_name: "All Food",
        menu_image: all_food_img
    },
    {
        menu_name: "Breakfast Meals",
        menu_image: snack_packs_img
    },
    {
        menu_name: "Rice Meals",
        menu_image: rice_meal_img
    },
    {
        menu_name: "Chicken Meals",
        menu_image: high_protein_img
    },
    {
        menu_name: "Beef Meals",
        menu_image: muscle_gain_img
    },
    {
        menu_name: "Fish Meals",
        menu_image: fish_meal_img
    },
    {
        menu_name: "Vegetarian Meals",
        menu_image: snack_packs_img
    },
    {
        menu_name: "Snacks",
        menu_image: snack_packs_img
    },
    {
        menu_name: "Drinks",
        menu_image: protein_drinks_img
    },
    {
        menu_name: "Meal Bundles",
        menu_image: meal_bundles_img
    }]

// Seed/demo food list kept for local UI fallback/reference.
// The live app mainly loads foods from the backend /api/food/list endpoint.
export const food_list = [
    {
        _id: "1",
        name: "High Protein Oats Pack",
        image: food_1,
        price: 350,
        description: "Instant oats pack with protein and complex carbs for gym nutrition.",
        category: "Breakfast Packs",
        calories: 420,
        protein: 28,
        carbs: 52,
        fat: 10,
        quantity: 20,
        shelfLifeDays: 180
    },
    {
        _id: "2",
        name: "Muscle Gain Meal Pack",
        image: food_2,
        price: 520,
        description: "High-calorie cooked meal for bulking and strength training.",
        category: "Muscle Gain",
        calories: 650,
        protein: 35,
        carbs: 75,
        fat: 18,
        quantity: 15,
        shelfLifeDays: 180
    }, {
        _id: "3",
        name: "Low Carb Snack Box",
        image: food_3,
        price: 430,
        description: "Low-carb cooked snack bundle for weight management.",
        category: "Low Carb",
        calories: 260,
        protein: 22,
        carbs: 18,
        fat: 12,
        quantity: 18,
        shelfLifeDays: 150
    }, {
        _id: "4",
        name: "Protein Bar Combo",
        image: food_4,
        price: 600,
        description: "Protein bar combo for pre-workout and post-workout nutrition.",
        category: "High Protein",
        calories: 210,
        protein: 20,
        carbs: 24,
        fat: 6,
        quantity: 25,
        shelfLifeDays: 240
    }, {
        _id: "5",
        name: "Peanut Butter Energy Pack",
        image: food_5,
        price: 480,
        description: "Healthy peanut butter energy pack with protein and good fats.",
        category: "Snack Packs",
        calories: 590,
        protein: 25,
        carbs: 22,
        fat: 46,
        quantity: 12,
        shelfLifeDays: 270
    }, {
        _id: "6",
        name: "Roasted Chickpea Protein Pack",
        image: food_6,
        price: 250,
        description: "Crunchy roasted chickpea pack with plant-based protein.",
        category: "Snack Packs",
        calories: 300,
        protein: 18,
        carbs: 42,
        fat: 7,
        quantity: 30,
        shelfLifeDays: 180
    }, {
        _id: "7",
        name: "Mixed Nuts Recovery Pack",
        image: food_7,
        price: 550,
        description: "Nuts and seeds recovery pack for healthy fats and minerals.",
        category: "Recovery Packs",
        calories: 480,
        protein: 16,
        carbs: 28,
        fat: 36,
        quantity: 16,
        shelfLifeDays: 210
    }, {
        _id: "8",
        name: "Instant Protein Shake Pack",
        image: food_8,
        price: 700,
        description: "Portable protein shake sachets for gym and travel.",
        category: "Drink Mixes",
        calories: 160,
        protein: 25,
        carbs: 8,
        fat: 3,
        quantity: 22,
        shelfLifeDays: 365
    }, {
        _id: "9",
        name: "Weight Loss Meal Pack",
        image: food_9,
        price: 450,
        description: "Calorie-controlled cooked meal for weight loss goals.",
        category: "Weight Loss",
        calories: 320,
        protein: 26,
        carbs: 34,
        fat: 8,
        quantity: 20,
        shelfLifeDays: 180
    }, {
        _id: "10",
        name: "Gym Starter Bundle",
        image: food_10,
        price: 1200,
        description: "Starter bundle with oats, protein snacks, nuts, and drink mix.",
        category: "Meal Bundles",
        calories: 900,
        protein: 55,
        carbs: 95,
        fat: 30,
        quantity: 10,
        shelfLifeDays: 180
    }
]
