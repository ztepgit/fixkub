// lib/device-parser.ts

// Helper สำหรับ Escape อักขระพิเศษใน Regex
function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseDeviceModel(input: string): { brand: string | null; normalizedModel: string } {
    if (!input) return { brand: null, normalizedModel: "" };

    let normalizedModel = input.trim();
    let brand: string | null = null;

    // Normalize string สำหรับการตรวจสอบ Brand
    // จัดการเปลี่ยนอักขระพิเศษให้กลายเป็นช่องว่าง เพื่อป้องกันปัญหา "ipad-mini" -> "ipad mini"
    const lowerInputForBrand = normalizedModel.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");

    // 🌟 1. Brand Mapping (ตรวจสอบด้วย Canonical Brand Priority)
    // ลำดับมีความสำคัญสูงที่สุด Sub-brand และแบรนด์เฉพาะเจาะจงต้องมาก่อน
    const BRAND_PRIORITY = [
        { brand: "POCO", keywords: ["poco", "โพโค", "โพโค่", "โปโค่", "โปโกะ"] },
        { brand: "IQOO", keywords: ["iqoo", "ไอคู", "ไอคิว", "ไอคิวโอ"] },
        {
            brand: "APPLE", keywords: ["iphone", "ipad", "macbook", "macbook air", "macbook pro", "mac mini", "imac", "apple watch", "airpods", "apple", "ไอโฟน", "ไอแพด", "แมคบุ๊ค", "แม็คบุ๊ค", "แอปเปิ้ล", "ไอแมค", "ไอแม็ค", "แมคมินิ", "แม็คมินิ", "mac mini",
                "แมคมินิ",
                "แม็คมินิ",
                "macmini"]
        },
        {
            brand: "SAMSUNG", keywords: ["samsung", "galaxy", "galaxy tab", "ซัมซุง", "กาแล็กซี่", "ซัมซุงกาแล็กซี่", "ซัมซุง กาแล็กซี่", "tab s",
                "tab a"]
        },
        { brand: "XIAOMI", keywords: ["xiaomi", "redmi", "xiaomi pad", "mi pad", "redmi pad", "เสี่ยวหมี่", "เรดมี่", "เรดหมี่", "มี่", "เสียวหมี่", "หมี่"] },
        { brand: "OPPO", keywords: ["oppo", "oppo pad", "ออปโป้", "ออปโป", "อ๊อปโป้", "อ็อปโป"] },
        { brand: "VIVO", keywords: ["vivo", "วีโว่", "วีโว"] },
        { brand: "REALME", keywords: ["realme", "เรียลมี"] },
        { brand: "HUAWEI", keywords: ["huawei", "หัวเว่ย", "หัวเหว่ย"] },
        { brand: "HONOR", keywords: ["honor", "honor pad", "ออเนอร์", "ฮอเนอร์"] },
        { brand: "INFINIX", keywords: ["infinix", "อินฟินิกซ์"] },
        { brand: "TECNO", keywords: ["tecno", "เทคโน"] },
        { brand: "NOKIA", keywords: ["nokia", "โนเกีย"] },
        { brand: "ASUS", keywords: ["asus", "rog", "zenfone", "เอซุส", "เอซัส", "เซนโฟน"] },
        { brand: "SONY", keywords: ["sony", "xperia", "โซนี่"] },
        { brand: "GOOGLE", keywords: ["google", "pixel", "กูเกิ้ล", "กูเกิล", "พิกเซล"] },
        { brand: "ONEPLUS", keywords: ["oneplus", "วันพลัส"] },
        { brand: "NOTHING", keywords: ["nothing", "cmf", "นอทติง", "นอตติง", "น็อทติ้ง", "น็อตติ้ง", "ซีเอ็มเอฟ"] },
        { brand: "MOTOROLA", keywords: ["motorola", "moto", "โมโตโรล่า", "โมโต"] },
        { brand: "LENOVO", keywords: ["lenovo", "lenovo tab", "เลอโนโว", "เลโนโว"] },
        { brand: "ZTE", keywords: ["zte", "แซดทีอี"] },
        { brand: "NUBIA", keywords: ["nubia", "นูเบีย"] },
        { brand: "MEIZU", keywords: ["meizu", "เมย์ซู", "เมซู", "เหมยซู่"] },
        { brand: "BLACKVIEW", keywords: ["blackview"] },
        { brand: "DOOGEE", keywords: ["doogee"] },
        { brand: "OUKITEL", keywords: ["oukitel", "อูกิเทล", "โอกิเทล"] },
        { brand: "UMIDIGI", keywords: ["umidigi"] },
        { brand: "ALLDOCUBE", keywords: ["alldocube", "aldocube", "ออลดูคูบ", "ออลดูคูป"] },
        { brand: "CHUWI", keywords: ["chuwi"] }
    ];

    for (const item of BRAND_PRIORITY) {
        // ใช้ RegExp เพื่อตรวจหาคำ (Word Boundary) ป้องกัน False Positive อย่างการเจอ string ในคำอื่น
        if (item.keywords.some(kw => new RegExp(`\\b${escapeRegex(kw)}\\b`, "i").test(lowerInputForBrand))) {
            brand = item.brand;
            break;
        }
    }

    // 🌟 2. Pre-process Glued Words (แยกคำที่พิมพ์ติดกันก่อนทำการ Normalization)
    const unglueRules: [RegExp, string][] = [
        // ===== Apple =====
        [/iphone(?=\d)/ig, "iphone "],
        [/promax/ig, "pro max"],
        [/iphone se/ig, "iphone se"],
        [/iphonese/ig, "iphone se"],

        [/ipadair/ig, "ipad air"],
        [/ipadmini/ig, "ipad mini"],
        [/ipadpro/ig, "ipad pro"],

        [/macbookair/ig, "macbook air"],
        [/macbookpro/ig, "macbook pro"],

        [/macmini/ig, "mac mini"],
        [/imac/ig, "iMac"],

        [/applewatch/ig, "apple watch"],

        // ===== Samsung =====
        [/galaxys/ig, "galaxy s"],
        [/galaxya/ig, "galaxy a"],
        [/galaxym/ig, "galaxy m"],
        [/galaxyzfold/ig, "galaxy z fold"],
        [/galaxyzflip/ig, "galaxy z flip"],

        [/galaxytab/ig, "galaxy tab"],
        [/tabs(?=\d)/ig, "tab s"], // รองรับ tabs10 -> tab s10
        [/taba(?=\d)/ig, "tab a"], // รองรับ taba9 -> tab a9

        // ===== Xiaomi =====
        [/redminote/ig, "redmi note"],
        [/redmik/ig, "redmi k"],
        [/xiaomipad/ig, "xiaomi pad"],
        [/mipad/ig, "mi pad"],
        [/redmipad/ig, "redmi pad"],

        // ===== POCO =====
        [/pocox/ig, "poco x"],
        [/pocof/ig, "poco f"],
        [/pocom/ig, "poco m"],
        [/pococ/ig, "poco c"],

        // ===== IQOO =====
        [/iqooneo/ig, "iqoo neo"],
        [/iqooz/ig, "iqoo z"],

        // ===== OPPO =====
        [/opporeno/ig, "oppo reno"],
        [/oppoa(\d+)/ig, "oppo a$1"],
        [/oppofindx/ig, "oppo find x"],
        [/oppopad/ig, "oppo pad"],

        // ===== Vivo =====
        [/vivov/ig, "vivo v"],
        [/vivoy/ig, "vivo y"],
        [/vivox/ig, "vivo x"],
        [/vivopad/ig, "vivo pad"],

        // ===== Realme =====
        [/realmec/ig, "realme c"],
        [/realmenarzo/ig, "realme narzo"],
        [/realmegt/ig, "realme gt"],
        [/realmepad/ig, "realme pad"],

        // ===== Huawei =====
        [/huaweipura/ig, "huawei pura"],
        [/huaweimate/ig, "huawei mate"],
        [/huaweinova/ig, "huawei nova"],
        [/matepad/ig, "matepad"],

        // ===== Honor =====
        [/honormagic/ig, "honor magic"],
        [/honorx(\d+)/ig, "honor x$1"],
        [/honorpad/ig, "honor pad"],

        // ===== Infinix =====
        [/infinixnote/ig, "infinix note"],
        [/infinixhot/ig, "infinix hot"],
        [/infinixzero/ig, "infinix zero"],

        // ===== Tecno =====
        [/tecnopova/ig, "tecno pova"],
        [/tecnospark/ig, "tecno spark"],
        [/tecnocamon/ig, "tecno camon"],

        // ===== Google =====
        [/pixel(?=\d)/ig, "pixel "],

        // ===== ASUS =====
        [/rogphone/ig, "rog phone"],
        [/zenfone(?=\d)/ig, "zenfone "],

        // ===== OnePlus =====
        [/oneplus(?=\d)/ig, "oneplus "],
        [/oneplusace/ig, "oneplus ace"],
        [/oneplusnord/ig, "oneplus nord"],

        // ===== Nothing =====
        [/nothingphone/ig, "nothing phone"],
        [/cmfphone/ig, "cmf phone"],

        // ===== Lenovo =====
        [/lenovotab/ig, "lenovo tab"],

        // ===== Motorola =====
        [/motog/ig, "moto g"],
        [/motorazr/ig, "moto razr"],

        // ===== Generic =====
        [/(\d)(pro|max|plus|ultra)/ig, "$1 $2"],
        [/(\d)(gb|tb)/ig, "$1 $2"],
    ];

    for (const [reg, replacement] of unglueRules) {
        normalizedModel = normalizedModel.replace(reg, replacement);
    }

    // 🌟 3. Normalization: เติมช่องว่างระหว่างตัวอักษรและตัวเลข 
    // เช่น "iphone14" -> "iphone 14" และ "14pro" -> "14 pro"
    normalizedModel = normalizedModel.replace(/([a-zA-Z]+)(\d+)/g, "$1 $2");
    normalizedModel = normalizedModel.replace(/(\d+)([a-zA-Z]+)/g, "$1 $2");

    // 🌟 4. Title Case: จัดระเบียบตัวพิมพ์เล็ก-ใหญ่ให้สม่ำเสมอพร้อมรองรับ Tablet / Sub-brand
    const titleCaseMap: Record<string, string> = {
        "iphone": "iPhone",
        "ipad": "iPad",
        "macbook": "MacBook",
        "imac": "iMac",
        "galaxy": "Galaxy",
        "samsung": "Samsung",
        "xiaomi": "Xiaomi",
        "redmi": "Redmi",
        "poco": "POCO",
        "oppo": "OPPO",
        "vivo": "VIVO",
        "iqoo": "iQOO",
        "realme": "realme",
        "huawei": "HUAWEI",
        "honor": "HONOR",
        "infinix": "Infinix",
        "tecno": "TECNO",
        "nokia": "Nokia",
        "asus": "ASUS",
        "rog": "ROG",
        "zenfone": "Zenfone",
        "sony": "Sony",
        "xperia": "Xperia",
        "google": "Google",
        "pixel": "Pixel",
        "oneplus": "OnePlus",
        "nothing": "Nothing",
        "cmf": "CMF",
        "motorola": "Motorola",
        "moto": "Moto",
        "lenovo": "Lenovo",
        "zte": "ZTE",
        "nubia": "Nubia",
        "meizu": "Meizu",
        "blackview": "Blackview",
        "doogee": "Doogee",
        "oukitel": "Oukitel",
        "umidigi": "Umidigi",
        "alldocube": "Alldocube",
        "aldocube": "Alldocube",
        "chuwi": "Chuwi",
        "pro": "Pro",
        "max": "Max",
        "ultra": "Ultra",
        "plus": "Plus",
        "note": "Note",
        "tab": "Tab",
        "mini": "Mini",
        "air": "Air",
        "neo": "Neo",
        "pad": "Pad",
        "matepad": "MatePad",
        "watch": "Watch",
        "airpods": "AirPods"
    };

    // จัดระเบียบ String ท้ายสุด ป้องกันช่องว่างซ้ำซ้อน
    const words = normalizedModel.trim().split(/\s+/);
    normalizedModel = words.map(word => {
        const lWord = word.toLowerCase();
        return titleCaseMap[lWord] || word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");

    // คืนค่าแบบ Fallback Rule (ถ้าหา Brand ไม่เจอให้เก็บเป็น Null แต่เก็บ Model ที่ Normalize แล้วไว้)
    return { brand, normalizedModel };
}