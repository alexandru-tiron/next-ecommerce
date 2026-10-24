// Demo catalogue: fictional brands and generic products, so the public demo carries no real trademarks.
// Prices are in the store currency (RON in the default settings).
export const categories = {
   Audio: { kind: "headphones", description: "Headphones, speakers and sound for every room", image: ["earbuds", "headphones", "speaker"] },
   "Computers & Phones": { kind: "laptop", description: "Laptops, tablets, phones and wearables", image: ["tablet", "laptop", "phone"] },
   "PC Accessories": { kind: "keyboard", description: "Everything around your desk", image: ["mouse", "monitor", "keyboard"] },
   Gaming: { kind: "controller", description: "Consoles, controllers and headsets", image: ["controller", "console", "gamingHeadset"] },
   "Smart Home": { kind: "bulb", description: "Speakers, lights and cameras for a connected home", image: ["bulb", "smartSpeaker", "camera"] },
};

// kind = artwork; weight in grams; intro and howTo are used for the product descriptions
export const subcategories = {
   Headphones: { category: "Audio", kind: "headphones", weight: 260, intro: "Over-ear headphones built for long listening sessions.", howTo: "Charge fully before first use, then hold the power button for two seconds to pair." },
   Earbuds: { category: "Audio", kind: "earbuds", weight: 55, intro: "True wireless earbuds that disappear in your ears and your pocket.", howTo: "Open the case next to your phone to pair, and try the ear tip sizes for the best fit." },
   Speakers: { category: "Audio", kind: "speaker", weight: 650, intro: "A portable speaker with big sound wherever you go.", howTo: "Hold the Bluetooth button until the light flashes, then pair from your phone." },
   Soundbars: { category: "Audio", kind: "soundbar", weight: 4800, intro: "A soundbar that turns any TV into a home cinema.", howTo: "Connect it to your TV's HDMI eARC port and turn on HDMI-CEC." },
   Laptops: { category: "Computers & Phones", kind: "laptop", weight: 1500, intro: "A laptop that keeps up with work, study and everything after." },
   Tablets: { category: "Computers & Phones", kind: "tablet", weight: 480, intro: "A tablet for reading, drawing, streaming and getting things done." },
   Phones: { category: "Computers & Phones", kind: "phone", weight: 190, intro: "A smartphone with the camera, battery and speed you need every day." },
   Smartwatches: { category: "Computers & Phones", kind: "smartwatch", weight: 45, intro: "A smartwatch that tracks your health and keeps you connected." },
   Mice: { category: "PC Accessories", kind: "mouse", weight: 110, intro: "A precise, comfortable mouse for work and play." },
   Keyboards: { category: "PC Accessories", kind: "keyboard", weight: 900, intro: "A keyboard that makes every keystroke feel right." },
   Monitors: { category: "PC Accessories", kind: "monitor", weight: 6200, intro: "A monitor with sharp detail and accurate colour." },
   Webcams: { category: "PC Accessories", kind: "webcam", weight: 160, intro: "A webcam that makes you look and sound your best on calls." },
   Consoles: { category: "Gaming", kind: "console", weight: 3200, intro: "A games console ready for new releases and old favourites." },
   Controllers: { category: "Gaming", kind: "controller", weight: 270, intro: "A controller with responsive buttons and all-day comfort." },
   "Gaming Headsets": { category: "Gaming", kind: "gamingHeadset", weight: 330, intro: "A gaming headset with clear chat and positional audio." },
   "Smart Speakers": { category: "Smart Home", kind: "smartSpeaker", weight: 340, intro: "A smart speaker that plays music and controls your home." },
   "Smart Lighting": { category: "Smart Home", kind: "bulb", weight: 300, intro: "Smart lighting you can schedule, dim and recolour from your phone." },
   "Security Cameras": { category: "Smart Home", kind: "camera", weight: 250, intro: "A security camera that keeps an eye on home while you're away." },
};

const colours = {
   black: ["Black", "#1f2937"], white: ["White", "#f3f4f6"], silver: ["Silver", "#cbd5e1"], blue: ["Blue", "#2563eb"], navy: ["Midnight Blue", "#1e3a8a"],
   red: ["Red", "#dc2626"], green: ["Sage Green", "#4d7c0f"], pink: ["Pink", "#ec4899"], grey: ["Graphite", "#4b5563"], sand: ["Sand", "#d6c6a8"],
   purple: ["Lavender", "#8b5cf6"], teal: ["Teal", "#0f766e"], orange: ["Orange", "#ea580c"], yellow: ["Yellow", "#eab308"],
};
const c = (...names) => names.map((name) => colours[name]);
const sizes = (...pairs) => pairs.map(([name, price]) => ({ name, price }));

// [subcategory, brand, name, price, features, colours, sizes]
export const products = [
   ["Headphones", "Aurion", "Aurion Studio ANC Headphones", 1399, ["adaptive noise cancelling", "40 hours of battery life", "clear hands-free calls"], c("black", "silver", "navy")],
   ["Headphones", "Nordwave", "Nordwave Drift Wireless Headphones", 649, ["deep bass tuning", "60 hours of battery life", "foldable design"], c("black", "blue", "white")],
   ["Headphones", "Kestrel", "Kestrel Monitor Pro Headphones", 899, ["studio-grade 45 mm drivers", "low-latency mode", "detachable cable"], c("black")],
   ["Earbuds", "Aurion", "Aurion Pods ANC", 799, ["active noise cancelling", "transparency mode", "wireless charging case"], c("white", "black")],
   ["Earbuds", "Lumio", "Lumio Buds Lite", 249, ["IPX5 sweat resistance", "28 hours with the case", "touch controls"], c("white", "pink", "teal")],
   ["Earbuds", "Kestrel", "Kestrel Sport Earbuds", 449, ["secure ear hooks", "IP67 waterproofing", "heart-rate sensor"], c("black", "orange")],
   ["Speakers", "Nordwave", "Nordwave Pulse Portable Speaker", 499, ["IP67 water and dust resistance", "14 hours of playtime", "stereo pairing"], c("black", "blue", "red", "teal")],
   ["Speakers", "Lumio", "Lumio Mini Speaker", 179, ["a pocket-sized design", "12 hours of battery life", "a carry strap"], c("black", "blue", "orange")],
   ["Speakers", "Vantor", "Vantor Boom 360 Speaker", 799, ["360° sound", "a built-in power bank", "24 hours of playtime"], c("black", "sand")],
   ["Soundbars", "Vantor", "Vantor Cinema 5.1 Soundbar", 2499, ["Dolby Atmos", "a wireless subwoofer", "voice enhancement"], c("black")],
   ["Soundbars", "Nordwave", "Nordwave Slim Soundbar", 999, ["a compact 2.1 design", "Bluetooth and HDMI eARC", "night mode"], c("black")],
   ["Laptops", "Brixel", "Brixel Air 14 Laptop", 4299, ["an 8-core processor", "a 14-inch 2.8K display", "18 hours of battery life"], c("grey", "silver"), sizes(["512 GB", 4299], ["1 TB", 4799])],
   ["Laptops", "Corvane", "Corvane Pro 16 Laptop", 6999, ["a dedicated graphics card", "a 165 Hz display", "a backlit keyboard"], c("grey"), sizes(["1 TB", 6999], ["2 TB", 7799])],
   ["Laptops", "Halvio", "Halvio Flex 13 2-in-1", 3299, ["a 360° hinge", "pen support", "a fingerprint reader"], c("silver", "navy")],
   ["Tablets", "Brixel", "Brixel Slate 11 Tablet", 2199, ["an 11-inch 120 Hz display", "quad speakers", "keyboard support"], c("grey", "blue"), sizes(["128 GB", 2199], ["256 GB", 2599])],
   ["Tablets", "Lumio", "Lumio Tab 10 Kids", 699, ["a drop-proof case", "parental controls", "12 hours of battery life"], c("blue", "pink")],
   ["Phones", "Halvio", "Halvio One Smartphone", 2999, ["a 50 MP triple camera", "a 120 Hz OLED display", "5000 mAh battery"], c("black", "green", "purple"), sizes(["128 GB", 2999], ["256 GB", 3399])],
   ["Phones", "Zentro", "Zentro Lite 5G", 1299, ["5G connectivity", "two-day battery life", "a 6.6-inch display"], c("black", "blue")],
   ["Phones", "Corvane", "Corvane X Pro", 4499, ["a periscope zoom camera", "IP68 protection", "65 W fast charging"], c("grey", "silver"), sizes(["256 GB", 4499], ["512 GB", 4999])],
   ["Smartwatches", "Kestrel", "Kestrel Run GPS Watch", 1499, ["dual-band GPS", "training readiness insights", "14-day battery life"], c("black", "white")],
   ["Smartwatches", "Zentro", "Zentro Fit Watch", 599, ["sleep tracking", "SpO2 monitoring", "a bright AMOLED screen"], c("black", "pink")],
   ["Mice", "Pylon", "Pylon Ergo Wireless Mouse", 349, ["an ergonomic shape", "silent clicks", "multi-device pairing"], c("grey", "white")],
   ["Mice", "Ostra", "Ostra Viper Gaming Mouse", 299, ["a 26K DPI sensor", "a 58 g design", "optical switches"], c("black", "white")],
   ["Keyboards", "Pylon", "Pylon Low-Profile Keyboard", 429, ["smart backlighting", "multi-device switching", "a slim aluminium frame"], c("grey")],
   ["Keyboards", "Ostra", "Ostra TKL Mechanical Keyboard", 549, ["hot-swappable switches", "RGB lighting", "a detachable USB-C cable"], c("black", "white")],
   ["Monitors", "Brixel", "Brixel View 27 4K Monitor", 2299, ["a 27-inch 4K IPS panel", "USB-C with 90 W charging", "factory calibration"], c("silver")],
   ["Monitors", "Ostra", "Ostra Arena 32 Curved Monitor", 1599, ["a 1000R curve", "a 170 Hz refresh rate", "adaptive sync"], c("black")],
   ["Webcams", "Pylon", "Pylon Stream 1080p Webcam", 299, ["Full HD 60 FPS video", "dual microphones", "a privacy shutter"], c("black")],
   ["Webcams", "Quilla", "Quilla 4K Pro Webcam", 799, ["4K HDR video", "auto framing", "low-light correction"], c("black")],
   ["Consoles", "Tavik", "Tavik Nova Console", 2499, ["4K gaming at 120 FPS", "a 1 TB SSD", "a controller in the box"], c("white", "black"), sizes(["1 TB", 2499], ["2 TB", 2999])],
   ["Consoles", "Tavik", "Tavik Go Handheld", 1799, ["a 7-inch OLED screen", "dock support", "8 hours of play"], c("white", "red")],
   ["Controllers", "Tavik", "Tavik Nova Controller", 299, ["haptic feedback", "adaptive triggers", "a built-in microphone"], c("white", "black", "red", "blue")],
   ["Controllers", "Ostra", "Ostra Pro Controller", 349, ["Hall effect sticks", "back paddles", "a charging dock"], c("black", "white")],
   ["Gaming Headsets", "Ostra", "Ostra Siege Wireless Headset", 699, ["2.4 GHz and Bluetooth", "a detachable microphone", "40 hours of battery life"], c("black", "white")],
   ["Gaming Headsets", "Kestrel", "Kestrel Arena Headset", 399, ["50 mm drivers", "memory-foam cushions", "an in-line volume wheel"], c("black", "red")],
   ["Smart Speakers", "Solvy", "Solvy Home Mini", 249, ["voice assistant support", "multi-room audio", "a wall-mountable design"], c("navy", "white", "grey")],
   ["Smart Speakers", "Solvy", "Solvy Home Display 8", 649, ["an 8-inch display", "video calls", "a privacy camera cover"], c("black", "white")],
   ["Smart Lighting", "Fenrow", "Fenrow Colour Bulb Starter Kit", 599, ["16 million colours", "schedules and scenes", "works without a hub"], c("white")],
   ["Smart Lighting", "Fenrow", "Fenrow Light Strip 2 m", 229, ["music sync", "cuttable to length", "app and voice control"], c("white")],
   ["Security Cameras", "Meridiane", "Meridiane Indoor Pan & Tilt Camera", 199, ["360° pan and tilt", "night vision", "motion tracking"], c("white")],
   ["Security Cameras", "Meridiane", "Meridiane Outdoor 2K Camera", 549, ["2K HDR video", "colour night vision", "a built-in siren"], c("white", "black")],
];

export const brandColours = ["#111827", "#1d4ed8", "#b91c1c", "#047857", "#7c3aed", "#c2410c", "#0f766e", "#be185d"];

export const reviewers = ["Andrei P.", "Maria I.", "Sam K.", "Ioana D.", "Lucas H.", "Elena R.", "Tom W.", "Ana G.", "Priya S.", "Vlad S.", "Diana B.", "Noah F.", "Laura F.", "Bogdan L.", "Emma J.", "Mateo R."];

export const reviewTexts = {
   5: ["Exactly what I was looking for. Great quality and fast delivery.", "Excellent value for the price. I'd buy it again.", "Works perfectly out of the box and feels well made.", "Better than I expected. The whole family loves it."],
   4: ["Very good overall. Setup took a little longer than expected.", "Great performance, although the price could be lower.", "Does everything I need. The manual could be clearer."],
   3: ["It's fine for the price, nothing special.", "Decent, but I had to update the firmware first."],
   2: ["Not quite what I expected from the description."],
};

export const customerNames = {
   first: ["Andrei", "Maria", "Ioana", "Mihai", "Elena", "Sam", "Ana", "Priya", "Vlad", "Diana", "Noah", "Laura", "Lucas", "Emma", "Mateo", "Sofia"],
   last: ["Popescu", "Ionescu", "Taylor", "Novak", "Rossi", "Müller", "Silva", "Kowalski", "Dumitru", "Stan", "Moreau", "Jensen"],
};
