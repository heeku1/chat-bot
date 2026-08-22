import { BotConfig } from "./types";

export const botTemplates: Array<{
  id: string;
  category: "E-Commerce" | "Crypto" | "Entertainment" | "Support" | "Cafe";
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  config: BotConfig;
}> = [
  {
    id: "template-ecom",
    category: "E-Commerce",
    title: "🛍️ น้องถุงเงิน | บอทแม่ค้าออนไลน์ & สั่งซื้อด่วน",
    subtitle: "ตอบแชต ขายของ แจกคูปอง และดูแลกลุ่มลูกค้า",
    description: "เหมาะสำหรับร้านค้าปลีก เสื้อผ้าแฟชั่น อาหาร และธุรกิจขายสินค้าที่ต้องการให้บอทคอยแจ้งข้อมูลราคาสินค้า โปรโมชั่น และวิธีการโอนเงินชำระเงินอัตโนมัติพร้อมแนบรูปภาพสินค้าประกอบ",
    icon: "🛒",
    color: "from-pink-500/10 to-rose-500/5 border-pink-500/30 text-pink-400",
    config: {
      name: "🛍️ น้องถุงเงิน | บอทแม่ค้าออนไลน์ & สั่งซื้อด่วน",
      token: "",
      platform: "all",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
      botCommands: [
        { command: "start", description: "เริ่มต้นช้อปปิ้งออนไลน์", reply: "สวัสดีค่ะคุณลูกค้า ยินดีต้อนรับสู่ร้านค้าอัจฉริยะ! ช้อปสนุก คุยง่าย กับแอดมินอัตโนมัติ 24 ชม. พิมพ์ 'โปรโมชั่น' เพื่อดูดีลสุดคุ้ม หรือกดปุ่มเมนูด้านล่างเพื่อสั่งซื้อได้เลยค่ะ! 🛒💖" },
        { command: "catalog", description: "ดูรายการสินค้าแนะนำยอดฮิตประจำสัปดาห์", reply: "📦 รายการสินค้าขายดีที่สุดสัปดาห์นี้:\n1. เสื้อฮู้ดผ้าฝ้ายหนานุ่มเกรดพรีเมียม (ราคา 490.-)\n2. หมวกบัคเก็ตมินิมอลกันแดด (ราคา 250.-)\n3. กระเป๋าเป้เดินทางกันน้ำ (ราคา 790.-)" },
        { command: "payment", description: "ดูวิธีการชำระเงินและแจ้งโอนเงิน", reply: "💳 ขั้นตอนการชำระเงิน:\n1. โอนเงินมายังบัญชีธนาคารกสิกรไทย\nเลขบัญชี: 987-6-54321-0 (บจก. ถุงเงิน ช้อปปิ้ง)\n2. แจ้งหลักฐานการโอนและที่อยู่จัดส่งสินค้าทางแชตนี้ได้ทันทีค่ะ!" }
      ],
      botButtons: {
        inlineButtons: [
          { text: "🛒 เข้าสู่เว็บสโตร์หลัก", url: "https://ai.studio/build" },
          { text: "🎁 รับโค้ดคูปองส่งฟรี", reply: "โค้ดส่งฟรีของคุณคือ: THUNGFREE กรอกในขั้นตอนเช็กเอาต์รับสิทธิ์ส่งฟรีไม่มีขั้นต่ำ!" },
          { text: "💬 คุยกับแอดมินที่เป็นคน", reply: "ระบบกำลังส่งเรื่องประสานงานให้แอดมินมนุษย์ติดต่อกลับด่วนภายใน 5 นาทีนะคะ ระหว่างนี้ปรึกษา AI ของเราก่อนได้เลยค่ะ!" }
        ],
        replyKeyboard: [
          { text: "📦 แคตตาล็อกสินค้าขายดี", reply: "สินค้าคอลเลกชันใหม่พร้อมส่งทุกตัว! เสื้อไหมพรม เสื้อแจ็คเก็ตกันลม และกางเกงสตรีทสไตล์ สนใจชิ้นไหนแคปรูปสอบถามราคาได้เลยค่ะ" },
          { text: "💳 รายละเอียดการชำระเงิน", reply: "สามารถโอนเงินได้ผ่านธนาคารกสิกรไทย บัญชี 987-6-54321-0 ชื่อบัญชี บจก. ถุงเงิน ช้อปปิ้ง ค่ะ" }
        ]
      },
      botMenuButton: {
        type: "web_app",
        text: "🛒 ช้อปสินค้าผ่านเว็บ",
        url: "https://ai.studio/build"
      },
      inlineQuerySettings: {
        enableInline: true,
        placeholder: "ค้นหาส่วนลดของร้าน...",
        results: [
          { id: "ecom-1", title: "🎟️ คูปองลด 100 บาท", description: "โค้ดเฉพาะสมาชิกสะสมแต้มครบกำหนด", content: "รหัสคูปองเฉพาะสมาชิก: CLUB100 (รับส่วนลดเงินสด 100 บาททันที)" }
        ]
      },
      botSettings: {
        welcomeMessage: "ยินดีต้อนรับสู่ ถุงเงิน สโตร์ ค่ะ! 🛍️✨\n\nเลือกค้นหาของขวัญโปรดของคุณโดยคลิกเมนูด้านล่างนี้ได้เลยค่ะ:",
        enableAiAssistant: true,
        aiPrompt: "คุณคือบอทแม่ค้าที่พูดเพราะ อัธยาศัยดี มีหางเสียง 'ค่ะ/นะคะ' ชื่อ 'น้องถุงเงิน' คอยแนะนำสินค้าแฟชั่นและคูปองส่วนลดอย่างสุภาพ ให้บริการรวดเร็วและกระตือรือร้นในการขาย",
        keyboards: [
          { text: "🛍️ แนะนำสินค้าใหม่", response: "วันนี้มีเสื้อยืดผ้าฝ้ายออร์แกนิก ลายสตรีทคอลเลกชันลิมิเต็ด ราคาเพียง 350 บาท (จากปกติ 490 บาท) สนใจจองสิทธิ์ด่วนค่ะ!" },
          { text: "📦 สถานะการจัดส่ง", response: "ทางร้านจัดส่งสินค้าผ่าน Flash/Kerry ทุกวันจันทร์-เสาร์ แจ้งเลขพัสดุในแชนแนลตอนเย็นเวลา 18:30 น. ค่ะ" }
        ],
        autoReplies: [
          { keyword: "ราคา", reply: "สินค้าร้านเราคุณภาพพรีเมียมราคาจับต้องได้ เริ่มต้นที่ 250 - 790 บาทเท่านั้นค่ะ!", imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80" },
          { keyword: "โปรโมชั่น", reply: "ดีลพิเศษวันนี้! ซื้อเสื้อยืด 2 ตัว รับฟรีหมวกบัคเก็ตสุดฮิป 1 ใบไปเลยทันทีค่ะ", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
          { keyword: "วิธีสั่งซื้อ", reply: "สั่งซื้อง่ายๆ เพียงระบุ 1. ชื่อสินค้า/ไซส์ 2. ที่อยู่เบอร์โทร 3. แนบสลิปชำระเงิน แล้วส่งมาในแชตนี้ได้เลยค่ะ" }
        ]
      },
      groupSettings: {
        welcomeNewMember: true,
        welcomeMessage: "🎉 ยินดีต้อนรับคุณ {name} เข้าสู่กลุ่มนักช้อปสุดวีไอพี!\nกรุณาเช็กดีลลับพิเศษประจำวันกดพิมพ์คำสั่ง /rules เพื่ออ่านข้อมูลกิจกรรมกลุ่มนะคะ",
        antiSpam: {
          blockLinks: true,
          blockSwearWords: true,
          warnLimit: 3
        },
        rulesAnnouncement: "📢 อัปเดตกฎและโปรโมชั่นประจำกลุ่มถุงเงินสตรีทแวร์:\n- ห้ามส่งลิงก์เว็บบอร์ดอื่นหรือโปรโมตกลุ่มทับซ้อน\n- โพสต์สลิปแจ้งซื้อที่ช่องทางแชตส่วนตัวบอทเท่านั้นเพื่อความปลอดภัยค่ะ",
        rulesInterval: 1,
        customCommands: [
          { command: "/rules", reply: "📢 กฎระเบียบประจำกลุ่มลูกค้าร้าน:\n- ห้ามชักชวนเล่นการพนัน/สแปมลิงก์โฆษณา\n- แอดมินไม่มีนโยบายทักแชตส่วนตัวไปขอเงินก่อน ระวังมิจฉาชีพนะคะ!" }
        ],
        autoTranslation: {
          enable: false,
          targetLanguage: "ภาษาไทย"
        }
      },
      channelSettings: {
        autoSignature: true,
        autoSignatureText: "🛒 ช้อปสินค้าแฟชั่นราคาโรงงาน คลิก @ThungNgernStoreBot",
        enableFormatting: "MarkdownV2",
        scheduledPosts: [
          { id: "ecom-p1", time: "12:00", content: "🚨 เที่ยงแล้ว! ช้อปด่วนโปรไฟลุก Flash Sale ลดราคาเสื้อหนาวเกรดเอ จากปกติ 890.- เหลือเพียง 390.- ด่วนเฉพาะชั่วโมงนี้!", imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      adminPermissions: {
        canDeleteMessages: true,
        canBanUsers: true,
        canPinMessages: true,
        canChangeGroupInfo: true
      },
      privacySettings: {
        allowDirectMessages: true,
        groupPrivacyMode: false,
        showPublicStats: true,
        hideBotCreator: false
      },
      externalApis: {
        webhookUrl: "https://api.thungngernstore.com/webhook",
        googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1_thungngern_leads/edit",
        customApiUrl: "https://api.thungngernstore.com/orders/v1",
        apiAuthToken: "token_thungngern_abc123",
        sendLeadsToApi: true
      },
      mediaLibrary: [
        {
          id: "media-1",
          name: "แบนเนอร์เปิดตัวสินค้าใหม่",
          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        },
        {
          id: "media-2",
          name: "ภาพโปรโมชั่นส่วนลดพิเศษ",
          url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        }
      ]
    }
  },
  {
    id: "template-crypto",
    category: "Crypto",
    title: "📈 CryptoSignal GPT | บอทชุมชนและส่งสัญญาณเทรด",
    subtitle: "วิเคราะห์กราฟเทคนิค ดึงราคาเหรียญ และคุมกฎกลุ่มคริปโต",
    description: "ออกแบบมาเพื่อสมาคมนักลงทุน เทรดเดอร์ หรือผู้นำคอมมูนิตี้ Web3 ที่ต้องการให้บอทคอยเตือนสติ ป้องกันสแปมลิงก์หลอกหลวง ตรวจเช็กพิกัด และอัปเดตราคาเหรียญ BTC, ETH, SOL",
    icon: "📈",
    color: "from-amber-500/10 to-yellow-500/5 border-amber-500/30 text-amber-400",
    config: {
      name: "📈 CryptoSignal GPT | บอทชุมชนและส่งสัญญาณเทรด",
      token: "",
      platform: "all",
      avatarUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=150&h=150&q=80",
      botCommands: [
        { command: "start", description: "เริ่มต้นวิเคราะห์ตลาดและดูราคาด่วน", reply: "⚡ ยินดีต้อนรับสู่ CryptoSignal GPT แหล่งข้อมูลเทรดเหรียญและสัญญาณคริปโตรายชั่วโมง! พิมพ์ชื่อเหรียญยอดฮิตเพื่อดูสัญญาณด่วน (เช่น 'btc', 'eth') หรือพิมพ์ถาม AI เพื่อขอแนวรับแนวต้านได้เลยครับ!" },
        { command: "signals", description: "ดึงสัญญาณเทรดล่าสุดประจำวัน", reply: "🚨 สัญญาณเทรด VIP ล่าสุด:\n🟢 BTC/USDT (Long Entry): $91,200 | Target: $93,500 | StopLoss: $89,800\n🔴 ETH/USDT (Short Entry): $3,450 | Target: $3,310 | StopLoss: $3,520\n(คำเตือน: นี่คือการจำลองการเทรด ไม่ใช่คำแนะนำทางการเงิน)" },
        { command: "airdrop", description: "ตรวจสอบข้อมูลรางวัลแจกแอร์ดรอปฟรี", reply: "🎁 อัปเดตรายการ Airdrop ฟรีในเครือข่ายชั้นนำ:\n1. Solana FreeNFT Claim: @SolAirdropVIPBot\n2. Base Chain Testnet: ทำเควสต์เพื่อรับแต้มสะสมแลกเหรียญต้นน้ำ" }
      ],
      botButtons: {
        inlineButtons: [
          { text: "📊 ดูตารางวิเคราะห์เทคนิค", url: "https://ai.studio/build" },
          { text: "🔥 สมัครเข้าแชตพรีเมียม VIP", reply: "สมัครกลุ่มเทรด VIP ติดต่อโดยตรงกับแอดมินฝ่ายบริการแชตพรีเมียมที่ @CryptoAdminVIP เลยวันนี้!" }
        ],
        replyKeyboard: [
          { text: "🎯 สัญญาณเทรดล่าสุด (Signals)", reply: "ดึงสัญญาณเทรดปัจจุบัน: แนะนำจับตาเหรียญ SOL มีสัญญานกลับตัวชัดเจนแนวรับสำคัญ $165" },
          { text: "📚 คู่มือสัญญาลักษณ์และเทคนิค", reply: "คู่มือเทรดสำหรับมือใหม่: ใช้เครื่องมือ EMA-20 และ RSI ในไทม์เฟรม 4H เพื่อความเสี่ยงต่ำที่สุด" }
        ]
      },
      botMenuButton: {
        type: "commands",
        text: "📊 วิเคราะห์ตลาดเรียลไทม์",
        url: "https://ai.studio/build"
      },
      inlineQuerySettings: {
        enableInline: true,
        placeholder: "ค้นหาข้อมูลคู่เหรียญ...",
        results: [
          { id: "crypto-1", title: "🟢 สัญญาณ BTC ด่วน", description: "อัปเดตราคาเป้าหมายระยะสั้น", content: "⚡ รายงานวิเคราะห์ BTC: ภาพรวมตลาดยังคง Bullish คาดการณ์มีลุ้นทดสอบ $100K ภายในสิ้นปีนี้" }
        ]
      },
      botSettings: {
        welcomeMessage: "ยินดีต้อนรับสู่สถานีวิเคราะห์คริปโตระดับโลก! 📈🤖\n\nโปรดใช้คำสั่งด้านล่างเพื่อเริ่มเช็กวิจัยและสัญญาณอัจฉริยะได้ทันทีค่ะ:",
        enableAiAssistant: true,
        aiPrompt: "คุณคือบอทอัจฉริยะชื่อ 'CryptoSignal GPT' ผู้เชี่ยวชาญด้านการวิเคราะห์แนวโน้มตลาดคริปโทเคอร์เรนซีด้วยเทคนิคัลคาร์ต, แท่งเทียน, ข้อมูล On-Chain และข่าวสารต่างประเทศ ให้ข้อมูลแม่นยำ กระชับ น่าตื่นเต้น และเน้นความปลอดภัย มีคำเตือนความเสี่ยงการลงทุนเสมอ",
        keyboards: [
          { text: "🚨 รีพอร์ตสัญญาณ VIP", response: "สัญญาณ VIP ล่าสุดบวกสะสมแล้วกว่า +18% จากรอบสัปดาห์ที่ผ่านมา สมัครแชนแนลพรีเมียมเพื่อเข้าถึงทันที!" },
          { text: "🛠️ แนะนำตัวชีวัดเทรด", response: "ตัวชี้วัดแนะนำสำหรับการรันเทรนด์ระยะกลาง: MACD ตัดขึ้นร่วมกับดัชนีวัดความกลัวและความโลภ (Fear & Greed Index) ที่ระดับต่ำกว่า 35 (Oversold)" }
        ],
        autoReplies: [
          { keyword: "btc", reply: "📊 BTC Update: ข้อมูลโครงสร้างราคาแนวรับใหญ่อยู่ที่ $88,000 แนวต้านแข็งแกร่ง $95,000 กำลังสะสมพลังเพื่อเบรกเอาต์ขาขึ้น!", imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=600&q=80" },
          { keyword: "eth", reply: "📊 ETH Update: รักษาระดับเหนือแนวรับ $3,200 ได้อย่างสวยงาม เตรียมเคลื่อนตัวไปหาเป้าหมายต้านย่อย $3,600 เร็วๆ นี้ครับ", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
          { keyword: "sol", reply: "📊 SOL Update: เหรียญแห่งเครือข่ายความเร็วสูง ลุ้นทำนิวไฮรอบปีหลังจากยืนระยะเหนือระดับ $180 สำเร็จ!" }
        ]
      },
      groupSettings: {
        welcomeNewMember: true,
        welcomeMessage: "🚀 ยินดีต้อนรับสมาชิกใหม่คุณ {name} สู่กิลด์นักเทรดคริปโตรีพอร์ต!\nพิมพ์คำสั่ง /rules เพื่ออ่านระเบียบชุมชน และขอต้อนรับผู้รักเทรดเดอร์ทุกคนครับ",
        antiSpam: {
          blockLinks: true,
          blockSwearWords: true,
          warnLimit: 3
        },
        rulesAnnouncement: "📢 ระเบียบความปลอดภัยในกลุ่มคริปโต:\n- ห้ามชักชวนลงทุนแชร์ลูกโซ่เด็ดขาด\n- ห้ามลงลิงก์หลอกลวงดักกระเป๋าตังค์ (Phishing Link)\n- แอดมินจะไม่ทักไปชวนฝากเทรดเด็ดขาด โปรดระวังผู้แอบอ้าง!",
        rulesInterval: 1,
        customCommands: [
          { command: "/rules", reply: "⚠️ กฎชุมชนนักลงทุนคริปโต:\n1. ห้ามสแปมเหรียญขยะหรือโปรโมตแอร์ดรอปที่น่าสงสัย\n2. พูดคุยกันด้วยเหตุผลและมีหลักฐานอ้างอิงเสมอ\n(การทำผิดกฎจะถูกลบข้อความและบล็อกบัญชีทันที)" }
        ],
        autoTranslation: {
          enable: false,
          targetLanguage: "ภาษาอังกฤษ"
        }
      },
      channelSettings: {
        autoSignature: true,
        autoSignatureText: "⚠️ การลงทุนในสินทรัพย์ดิจิทัลมีความเสี่ยงสูง ผู้ลงทุนควรศึกษาข้อมูลก่อนตัดสินใจเทรด | @CryptoSignalsVipChannel",
        enableFormatting: "MarkdownV2",
        scheduledPosts: [
          { id: "crypto-p1", time: "08:30", content: "🚨 [Crypto Daily Morning Alert] ตลาดเช้านี้เปิดตัวสว่างสดใส ดัชนีความกลัวอยู่ที่ระดับ Greed (68) ปริมาณการซื้อขายหนาแน่นขึ้นอย่างต่อเนื่อง!", imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      adminPermissions: {
        canDeleteMessages: true,
        canBanUsers: true,
        canPinMessages: true,
        canChangeGroupInfo: false
      },
      privacySettings: {
        allowDirectMessages: true,
        groupPrivacyMode: true,
        showPublicStats: true,
        hideBotCreator: false
      },
      externalApis: {
        webhookUrl: "https://api.cryptosignals.com/webhook-tele",
        googleSheetsUrl: "",
        customApiUrl: "https://api.cryptosignals.com/v1/ticker/btc",
        apiAuthToken: "crypto_api_key_xyz987",
        sendLeadsToApi: false
      },
      mediaLibrary: [
        {
          id: "crypto-m1",
          name: "แบนเนอร์คริปโตและกราฟเทคนิค",
          url: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        }
      ]
    }
  },
  {
    id: "template-movie",
    category: "Entertainment",
    title: "🎬 CineBuddy | บอทแวดวงภาพยนตร์ & ป้ายยาซีรีส์",
    subtitle: "รีวิวภาพยนตร์ดัง แนะนำรอบฉาย เล่นเกมเกมตอบคำถามกลุ่ม",
    description: "สร้างความบันเทิงให้กับกลุ่มด้วยควิซทายหนัง แนะนำสตรีมมิ่งยอดฮิตใน Netflix, Disney, Marvel และส่งโพสต์กำหนดเวลาป้ายยาหนังพล็อตเทพในรอบสัปดาห์พร้อมแบนเนอร์โปสเตอร์ขนาดเต็มพิกัด",
    icon: "🎬",
    color: "from-purple-500/10 to-indigo-500/5 border-purple-500/30 text-purple-400",
    config: {
      name: "🎬 CineBuddy | บอทแนะนำภาพยนตร์ & ป้ายยาซีรีส์",
      token: "",
      platform: "all",
      avatarUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=150&h=150&q=80",
      botCommands: [
        { command: "start", description: "ต้อนรับและรับลิสต์ภาพยนตร์ยอดนิยมล่าสุด", reply: "สวัสดีครับคนรักเสียงหนังและซีรีส์! ยินดีต้อนรับเข้าสู่ CineBuddy เพื่อนแท้ภาพยนตร์ของคุณ! พิมพ์คำสำคัญที่ต้องการ เช่น 'netflix', 'marvel', 'สยองขวัญ' หรือ 'ดิสนีย์' เพื่อรับลิสต์หนังน่าดู หรือให้ AI แนะนำซีรีส์ให้แบบเฉพาะบุคคลได้เลยครับ! 🍿📺" },
        { command: "nowplaying", description: "เช็กรายชื่อหนังเข้าใหม่สุดโปรดในสัปดาห์นี้", reply: "🎬 รายชื่อภาพยนตร์เข้าใหม่พรีเมียมสัปดาห์นี้:\n1. Interstellar II (ไซไฟอวกาศฟอร์มยักษ์)\n2. Midnight Sonata (ภาพยนตร์สืบสวนระทึกขวัญระดับออสการ์)\n3. Cartoon Odyssey (อนิเมชั่นน่ารักสดใสดูได้ทั้งครอบครัว)" },
        { command: "quiz", description: "ทายคำถามภาพยนตร์ลุ้นรางวัล", reply: "🎯 ได้เวลาสนุกกันแล้ว! คำถามแรก:\n'ภาพยนตร์เรื่องใดที่มีประโยคทองยอดฮิตตลอดกาลว่า \"May the Force be with you\" ?'\n(พิมพ์ตอบข้อ A หรือพิมพ์ชื่อเรื่องได้เลยครับ!)" }
      ],
      botButtons: {
        inlineButtons: [
          { text: "🍿 จองตั๋วภาพยนตร์ออนไลน์", url: "https://ai.studio/build" },
          { text: "⭐ รีวิวและสถิติคะแนนหนัง", reply: "คะแนนเฉลี่ยประดับสัปดาห์นี้ภาพยนตร์ที่โกยคำชมมากที่สุดคือเรื่อง 'Oppenheimer' ได้รับการโหวตจากนักวิจารณ์สูงถึง 9.5/10 คะแนนครับ!" }
        ],
        replyKeyboard: [
          { text: "🎬 ภาพยนตร์แนะนำสัปดาห์นี้", reply: "อยากดูสไตล์ไหนดีครับ? พิมพ์บอกคีย์เวิร์ดอย่าง 'แอคชั่น', 'ตลก' หรือ 'โรแมนติก' ได้เลย มีหนังพร้อมป้ายยาเพียบ!" },
          { text: "🏆 รายการรางวัลออสการ์ล่าสุด", reply: "อัปเดตผลรางวัลออสการ์ครั้งที่ผ่านมา ภาพยนตร์ยอดเยี่ยมยอดโหวตสูงสุดคือ 'Everything Everywhere All at Once' กวาดรางวัลใหญ่ไปอย่างสมศักดิ์ศรี!" }
        ]
      },
      botMenuButton: {
        type: "commands",
        text: "🎬 ตรวจสอบรอบฉายหนังด่วน",
        url: "https://ai.studio/build"
      },
      inlineQuerySettings: {
        enableInline: true,
        placeholder: "ค้นหาข้อมูลรีวิวหนังด่วน...",
        results: [
          { id: "movie-1", title: "รีวิวภาพยนตร์ดังประจำวัน", description: "อ่านบทสรุปรีวิวกระชับไม่มีสปอยล์", content: "🎬 รีวิว: Dune Part II ยกระดับความอลังการของงานภาพและการแสดงที่ไร้ที่ติ ให้เต็ม 10/10 แบบไม่หักเลยครับ!" }
        ]
      },
      botSettings: {
        welcomeMessage: "ยินดีต้อนรับคนรักหนังทุกท่านเข้าสู่แชตรวมพลกูรูพรีวิวภาพยนตร์! 🍿🎥\n\nสืบค้นข้อมูลบันเทิงแบบด่วนโดยคลิกเลือกเมนูด้านล่างนี้ได้เลยครับ:",
        enableAiAssistant: true,
        aiPrompt: "คุณคือบอทกูรูนักวิจารณ์ภาพยนตร์ผู้เฉียบแหลมชื่อ 'CineBuddy' มีความรอบรู้ในประวัติศาสตร์ภาพยนตร์ ซีรีส์ทุกค่าย เช่น Netflix, Disney+, Marvel, อนิเมะญี่ปุ่น ชวนคุยอย่างตื่นเต้น เป็นมิตร กระตุ้นความบันเทิง และแจกป้ายยาหนังที่คนต้องหลงรัก",
        keyboards: [
          { text: "🍿 แนะนำซีรีส์ติดงอมแงม", response: "แนะนำห้ามพลาดสำหรับสายดูรวดเดียวจบ: 1. Stranger Things (ลึกลับสยองขวัญ) 2. Succession (ชิงไหวชิงพริบดราม่า) 3. Demon Slayer (อนิเมะต่อสู้สุดอลังการ)!" },
          { text: "🎞️ แหล่งสตรีมมิ่งแนะนำ", response: "สามารถสตรีมมิ่งถูกลิขสิทธิ์ได้อย่างปลอดภัยผ่านแอป Netflix, Disney+ Hotstar, Prime Video และ HBO Go สมัครบริการวันนี้รับสิทธิ์สตรีมเมอร์ส่วนลดพิเศษ" }
        ],
        autoReplies: [
          { keyword: "netflix", reply: "📺 ลิสต์ภาพยนตร์ฟีเจอร์เด่นสุดปังใน Netflix แนะนำคืนนี้: ห้ามพลาดแนวระทึกขวัญสายสืบคดีสืบสวน 'Glass Onion' และสารคดีประวัติศาสตร์ยอดฮิต!", imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80" },
          { keyword: "marvel", reply: "🛡️ รวมคอลเลกชันซูเปอร์ฮีโร่จักรวาล Marvel: แนะนำรับชมซีรีส์สุดอลังการ 'Loki Season 2' ที่ดึงโครงข่ายพล็อตสุดอัศจรรย์สตรีมมิ่งครบทุกตอนแล้วตอนนี้ครับ!", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
          { keyword: "สยองขวัญ", reply: "👻 สำหรับสายแข็งคนรักความตื่นเต้น: แนะนำภาพยนตร์ระดับตำนาน 'The Conjuring' หรือหนังระทึกขวัญลึกลับ 'Talk to Me' เตรียมปิดไฟและกอดหมอนข้างให้แน่นๆ นะครับ!" }
        ]
      },
      groupSettings: {
        welcomeNewMember: true,
        welcomeMessage: "🎉 ขอต้อนรับคุณ {name} สู่กิลด์คนรักหนัง CineBuddy Community!\nก่อนจะร่วมคุยแบ่งปันคะแนนรีวิวหนังรบกวนพิมพ์ /rules เพื่อเช็กกฎกันนิดนึงนะครับขอรับ",
        antiSpam: {
          blockLinks: true,
          blockSwearWords: true,
          warnLimit: 3
        },
        rulesAnnouncement: "📢 อัปเดตระเบียบสมาชิกกลุ่มคอหนังไซไฟและแฟนบอย:\n- ห้ามโพสต์สปอยล์เนื้อหาจุดสำคัญของภาพยนตร์เข้าใหม่เป็นอันขาด (โปรดสวมสปอยเลอร์แท็ก)\n- ห้ามโพสต์แชร์ลิงก์ละเมิดลิขสิทธิ์หรือเว็บดูหนังเถื่อนเด็ดขาด",
        rulesInterval: 1,
        customCommands: [
          { command: "/rules", reply: "⚠️ กฎชุมชนคนรักหนัง:\n1. พูดคุยถกเถียงเรื่องบทวิจารณ์ด้วยถ้อยคำสุภาพ\n2. ห้ามโพสต์ลิงก์ดูหนังเถื่อนผิดลิขสิทธิ์ทุกรูปแบบ ฝ่าฝืนจะถูกแบนออกจากกลุ่มทันทีค่ะ" }
        ],
        autoTranslation: {
          enable: false,
          targetLanguage: "ภาษาไทย"
        }
      },
      channelSettings: {
        autoSignature: true,
        autoSignatureText: "🍿 ติดตามพรีวิวและรีวิวก่อนใครที่ @CineBuddyChannel",
        enableFormatting: "MarkdownV2",
        scheduledPosts: [
          { id: "movie-p1", time: "19:00", content: "📢 [Weekend Movie Recommendation] แนะนำหนังฟอร์มยักษ์ฉายวันหยุดยาวนี้ที่คนรักอวกาศห้ามพลาด สัมผัสความประทับใจพล็อตระดับตำนานอีกครั้ง!", imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      adminPermissions: {
        canDeleteMessages: true,
        canBanUsers: true,
        canPinMessages: true,
        canChangeGroupInfo: true
      },
      privacySettings: {
        allowDirectMessages: true,
        groupPrivacyMode: false,
        showPublicStats: true,
        hideBotCreator: false
      },
      externalApis: {
        webhookUrl: "https://api.cinebuddy.com/tele-hook",
        googleSheetsUrl: "",
        customApiUrl: "",
        apiAuthToken: "",
        sendLeadsToApi: false
      },
      mediaLibrary: [
        {
          id: "movie-m1",
          name: "แบนเนอร์ภาพยนตร์และพรีวิวรีวิว",
          url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        }
      ]
    }
  },
  {
    id: "template-support",
    category: "Support",
    title: "🧠 CareBot Support | บริการลูกค้าหลังการขายระดับพรีเมียม",
    subtitle: "ระบบเปิดคิวร้องเรียน ตรวจเช็ก Server Status และตอบบอตซัพพอร์ต",
    description: "ยกระดับภาพลักษณ์แบรนด์ด้วยบอทสนับสนุนลูกค้า ช่วยคัดกรองปัญหาทางเทคนิค แจ้งสถานะระบบเครือข่าย ให้คำตอบ FAQs ทันใจ และเชื่อมต่อ API ปลายทางเพื่อส่งต่อ Leads ได้อย่างลื่นไหล",
    icon: "🧠",
    color: "from-blue-500/10 to-sky-500/5 border-blue-500/30 text-blue-400",
    config: {
      name: "🧠 CareBot Support | บริการลูกค้าหลังการขายระดับพรีเมียม",
      token: "",
      platform: "all",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
      botCommands: [
        { command: "start", description: "เริ่มต้นการขอรับความช่วยเหลือเทคนิค", reply: "สวัสดีค่ะ ยินดีต้อนรับเข้าสู่ศูนย์ช่วยเหลือ CareBot Support อัจฉริยะ! เรายินดีดูแลและให้บริการประสานงานข้อมูล พิมพ์ 'ติดต่อแอดมิน' หรือคลิกพิมพ์ข้อซักถามคีย์เวิร์ดด้านล่างเพื่อสืบค้นวิธีการแก้ไขปัญหาได้ทันทีค่ะ 🛡️💙" },
        { command: "support", description: "เปิดตั๋วใบประสานงานช่วยเหลือ (Create Support Ticket)", reply: "📝 วิธีการเปิดคำร้องช่วยเหลือช่วยเหลือ (Service Ticket):\n1. พิมพ์รายละเอียดปัญหาที่พบบนผลิตภัณฑ์\n2. ระบุเลขผู้ใช้งานหรือเลขใบเสร็จการสั่งซื้อ\n3. เจ้าหน้าที่วิศวกรฝ่ายเทคนิคจะตอบกลับพร้อมแก้ไขปัญหาให้คุณผ่านอีเมลภายใน 1 ชั่วโมงทำการค่ะ" },
        { command: "status", description: "ตรวจสอบสถานะการทำงานของระบบเซิร์ฟเวอร์", reply: "🟢 รายงานสถานะการให้บริการ (Server Status):\n- API Gateway: ปกติ (เสถียร 99.9%)\n- Database Server: ปกติ\n- Customer Portal: ปกติ ไม่มีช่วงปิดระบบปรับปรุงในสัปดาห์นี้ค่ะ" }
      ],
      botButtons: {
        inlineButtons: [
          { text: "💻 เปิดพอร์ทัลช่วยเหลือลูกค้า", url: "https://ai.studio/build" },
          { text: "📜 นโยบายคุ้มครองความพึงพอใจ", reply: "นโยบายคืนเงิน: ทางบริษัทฯ รับประกันความพึงพอใจ ยินดีคืนเงินค่าธรรมเนียมเต็มจำนวนภายใน 14 วันทำการนับตั้งแต่วันเริ่มต้นใช้งานหากไม่ได้รับความพึงพอใจค่ะ" }
        ],
        replyKeyboard: [
          { text: "📌 คู่มือแก้ปัญหาเบื้องต้น (FAQs)", reply: "ปัญหาพบบ่อย: 1. ล็อกอินไม่สำเร็จ (แนะนำให้ล้างคุกกี้บราวเซอร์หรือกดลืมรหัสผ่าน) 2. ระบบเชื่อมต่อล่าช้า (ให้เช็กสัญญาณเครือข่ายและอัปเดตแอปพลิเคชันเป็นรุ่นล่าสุด)" },
          { text: "📞 เบอร์ติดต่อด่วนและพนักงานจริง", reply: "สายด่วนแผนกสนับสนุนด้านเทคนิคพิเศษ โทรฟรีทั่วไทยได้ที่ 1800-999-000 ทุกวันทำการวันจันทร์-ศุกร์ เวลา 08:30 - 17:30 น. ค่ะ" }
        ]
      },
      botMenuButton: {
        type: "commands",
        text: "🧠 เปิดคู่มือและ FAQ ซัพพอร์ต",
        url: "https://ai.studio/build"
      },
      inlineQuerySettings: {
        enableInline: true,
        placeholder: "ค้นหาคู่มือปัญหาด่วน...",
        results: [
          { id: "support-1", title: "🔑 วิธีแก้ปัญหารหัสผ่าน", description: "ขั้นตอนกู้คืนบัญชีอย่างปลอดภัย", content: "วิธีรีเซ็ตรหัสผ่าน: เข้าไปที่หน้าล็อกอินหลักของบริการ คลิกที่ลิงก์ 'ลืมรหัสผ่าน' และทำตามลิงก์ยืนยันในอีเมลของคุณได้เลยค่ะ" }
        ]
      },
      botSettings: {
        welcomeMessage: "ขอต้อนรับสู่พอร์ทัลดูแลสนับสนุนลูกค้าระดับมืออาชีพ CareBot Support 🤖🛡️\n\nโปรดระบุปัญหาเทคนิคเพื่อส่งให้ AI ช่วยคิดค้นวิธีแก้ปัญหาเบื้องต้นด่วนด้านล่างนี้เลยค่ะ:",
        enableAiAssistant: true,
        aiPrompt: "คุณคือบอทให้บริการดูแลลูกค้ามืออาชีพชื่อ 'CareBot' คอยตอบคำถามและให้คำแนะนำแก้ปัญหาทางเทคนิคด้วยท่าทีที่เป็นกลาง สุภาพ อ่อนหวาน ใจเย็น และให้คำชี้แจงตามระบบความรู้สากลอย่างเป็นขั้นเป็นตอน มีโครงสร้างอธิบายชัดเจน",
        keyboards: [
          { text: "🛡️ ขอคืนเงินหรือแจ้งยกเลิก", response: "ท่านสามารถส่งคำขอคืนเงินอย่างเป็นทางการได้โดยแนบเลขทำธุรกรรมมาที่แผนกบัญชีและการเงินอีเมล billing@carebotsupport.com ยินดีอำนวยความสะดวกใน 3 วันทำการค่ะ" },
          { text: "📍 ดาวน์โหลดใบเสนอราคา", response: "เอกสารนำเสนอแผนการให้บริการเชิงพาณิชย์และใบเสนอราคาสำหรับลูกค้าประเภทองค์กร สามารถดาวน์โหลดไฟล์ PDF ล่าสุดผ่านระบบเว็บพอร์ทัลหลักของบริษัทค่ะ" }
        ],
        autoReplies: [
          { keyword: "ราคา", reply: "แพ็คเกจเริ่มต้นสำหรับผู้ใช้ทั่วไปเพียง $9.99 ต่อเดือน สำหรับทีมขนาดเล็กราคาเริ่มต้น $29.99/เดือน คุ้มค่าและประหยัดงบประมาณระดับองค์กรค่ะ!", imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80" },
          { keyword: "ติดต่อแอดมิน", reply: "เจ้าหน้าที่สนับสนุนวิชาการตัวจริงพร้อมให้บริการในแชตส่วนตัวด่วน! สามารถติดต่อสายตรงแอดมินที่บัญชีชื่อทางการ @CustomerCareExecutive ได้เลยค่ะ", imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      groupSettings: {
        welcomeNewMember: true,
        welcomeMessage: "🎉 ขอต้อนรับคุณ {name} สู่กลุ่มบริการสนับสนุนทางเทคนิคของบริษัทอย่างเป็นทางการ!\nรบกวนปฏิบัติตามคำแนะนำของบอทและระเบียบกลุ่มเพื่อความร่วมมือที่ดีนะคะ",
        antiSpam: {
          blockLinks: true,
          blockSwearWords: true,
          warnLimit: 3
        },
        rulesAnnouncement: "📢 ระเบียบความเรียบร้อยกลุ่มสนับสนุนวิชาการและดูแลความปลอดภัย:\n- งดการโพสต์โปรโมตสินค้าเชิงพาณิชย์อื่นๆ นอกเหนือการซัพพอร์ตแอปหลัก\n- ห้ามแสดงข้อความเชิงลบไม่เหมาะสม หรือหลอกลวงต้มตุ๋นผู้ใช้อื่นในกลุ่มค่ะ",
        rulesInterval: 1,
        customCommands: [
          { command: "/rules", reply: "📢 กฎเกณฑ์กลุ่มซัพพอร์ต:\n- โปรดใช้ภาษาที่เข้าใจง่ายและสุภาพในการแจ้งเรื่องปัญหา\n- ห้ามแชร์ข้อมูลรหัสส่วนตัวหรือ API Token ลงกลุ่มสาธารณะเด็ดขาดเพื่อความปลอดภัย" }
        ],
        autoTranslation: {
          enable: false,
          targetLanguage: "ภาษาไทย"
        }
      },
      channelSettings: {
        autoSignature: true,
        autoSignatureText: "📢 ศูนย์ประสานงานและประกาศสถานะแอปพลิเคชันอย่างเป็นทางการ | ติดต่อฝ่ายเทคนิค @TechnicalLeadBot",
        enableFormatting: "MarkdownV2",
        scheduledPosts: [
          { id: "support-p1", time: "09:00", content: "⚙️ [Scheduled Maintenance Report] ระบบได้รับการอัปเกรดความเสถียรและปิดบำรุงรักษาโฮสติ้งเป็นที่เรียบร้อยในเช้ามืดวันนี้ ระบบกลับมาให้บริการเต็มกำลัง 100% แล้วค่ะ", imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      adminPermissions: {
        canDeleteMessages: true,
        canBanUsers: true,
        canPinMessages: true,
        canChangeGroupInfo: false
      },
      privacySettings: {
        allowDirectMessages: true,
        groupPrivacyMode: true,
        showPublicStats: true,
        hideBotCreator: false
      },
      externalApis: {
        webhookUrl: "https://api.carebotsupport.com/tele-inbound",
        googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1_carebot_tickets/edit",
        customApiUrl: "",
        apiAuthToken: "",
        sendLeadsToApi: true
      },
      mediaLibrary: [
        {
          id: "support-m1",
          name: "แบนเนอร์ให้ความซัพพอร์ตช่วยเหลือ",
          url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        }
      ]
    }
  },
  {
    id: "template-cafe",
    category: "Cafe",
    title: "☕ Cafe Co-Working Space | บอทจองโต๊ะและสั่งเครื่องดื่ม",
    subtitle: "บริการจองมุมพักผ่อนและสั่งกาแฟรสเลิศผ่าน Telegram",
    description: "เปลี่ยนช่องทางแชตเป็นบาริสต้าต้อนรับ แนะนำกาแฟเมล็ดพิเศษอัปเดตสต็อก จัดระบบจองโต๊ะห้องประชุมเงียบสำหรับฟรีแลนซ์ และแชร์พิกัดเส้นทางการเดินทางด้วย BTS ครบวงจร",
    icon: "☕",
    color: "from-emerald-500/10 to-teal-500/5 border-emerald-500/30 text-emerald-400",
    config: {
      name: "☕ Cafe Co-Working Space | บอทจองโต๊ะและสั่งเครื่องดื่ม",
      token: "",
      platform: "all",
      avatarUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=150&h=150&q=80",
      botCommands: [
        { command: "start", description: "เริ่มต้นใช้บริการคาเฟ่พรีเมียมและพื้นที่", reply: "สวัสดีครับคุณคอกาแฟและฟรีแลนซ์! ยินดีต้อนรับเข้าสู่ระบบ Cafe Co-Working Space แสนอบอุ่น! สั่งเมนูร้อน/เย็นสุดฟิน หรือจองโต๊ะนั่งทำงานที่มีอินเทอร์เน็ตความเร็วสูงได้ง่ายๆ พิมพ์คีย์เวิร์ด 'พิกัด' เพื่อดูแผนที่ หรือพิมพ์ 'เมนู' เพื่อดูอาหารแนะนำวันนี้ได้เลยครับ! ☕🍰💻" },
        { command: "booking", description: "จองบริการโต๊ะทำงานล่วงหน้า", reply: "📅 ขั้นตอนการจองโต๊ะ Co-Working Space:\n1. เลือกช่วงเวลาที่ต้องการ (เปิดทุกวัน 08:00 - 22:00 น.)\n2. ระบุจำนวนผู้ใช้งาน (เริ่มจองขั้นต่ำ 2 ชั่วโมง เพียงชั่วโมงละ 50 บาท ฟรีชาอู่หลงเติมได้ไม่อั้น!)\n3. กดส่งข้อมูลยืนยันรับรหัสจองผ่านแชตนี้ได้ทันทีครับ" },
        { command: "menu", description: "ดูอาหาร ขนมหวาน และกาแฟโฮมเมดทั้งหมด", reply: "☕ รายการเมนูแนะนำสไตล์โฮมคาเฟ่วันนี้:\n- อเมริกาโน่น้ำส้มคั้นสดเมล็ดคั่วอ่อนพิเศษ (ราคา 110.-)\n- คาราเมลมัคคิอาโตหอมกรุ่นออร์แกนิกนมสด (ราคา 125.-)\n- เลมอนชีสเค้กเปรี้ยวหวานละมุนลิ้น (ราคา 140.-)" }
      ],
      botButtons: {
        inlineButtons: [
          { text: "☕ สั่งเครื่องดื่มจัดส่งเดลิเวอรี่", url: "https://ai.studio/build" },
          { text: "📍 รับคูปองลดพิเศษ 10%", reply: "โค้ดลับคาเฟ่สุดชิล: COFFEE10 (รับส่วนลดเครื่องดื่มทันที 10% เมื่อแสดงต่อหน้าเคาน์เตอร์แคชเชียร์ครับ!)" }
        ],
        replyKeyboard: [
          { text: "☕ สั่งขนมและเครื่องดื่ม", reply: "เครื่องดื่มยอดนิยมของเราวันนี้คือ 'Dirty Coffee' กาแฟสกัดเข้มข้นหยดลงบนนมเย็นจัด หอมกรุ่นอัดแน่นสไตล์คาเฟ่แท้ๆ" },
          { text: "📍 วิธีเดินทางและพิกัดแผนที่", reply: "พิกัดร้านคาเฟ่: เดินทางง่ายๆ เพียงลงรถไฟฟ้า BTS สถานีอารีย์ ทางออก 3 เดินต่อเข้าซอยพหลโยธิน 7 เพียง 300 เมตรก็เจอร้านสไตล์นอร์ดิกหลังคาขาวแล้วครับ!" }
        ]
      },
      botMenuButton: {
        type: "commands",
        text: "☕ สั่งขนมและอาหารออนไลน์",
        url: "https://ai.studio/build"
      },
      inlineQuerySettings: {
        enableInline: true,
        placeholder: "ค้นหาข้อมูลคู่เมนู...",
        results: [
          { id: "cafe-1", title: "☕ คูปองแลกซื้อขนมลด 50%", description: "โค้ดลดครึ่งราคาเมื่อซื้อเครื่องดื่มแรก", content: "รหัสโปรขนมหวาน: PASTRY50 (รับส่วนลดครัวซองต์เนยฝรั่งเศสทันที 50% เมื่อสั่งกาแฟชนิดใดก็ได้)" }
        ]
      },
      botSettings: {
        welcomeMessage: "ยินดีต้อนรับสู่อ้อมกอดของกลิ่นกาแฟสดคั่วใหม่และพื้นที่จุดประกายไอเดียการทำงาน! ☕🌿\n\nเลือกบริการจองโต๊ะหรือสั่งเครื่องดื่มผ่านปุ่มแสนสะดวกด้านล่างนี้ได้เลยครับ:",
        enableAiAssistant: true,
        aiPrompt: "คุณคือบอทบาริสต้าต้อนรับสุดอบอุ่น เป็นมิตร สุภาพ มีความรอบรู้เรื่องเมล็ดกาแฟสายพันธุ์พิเศษ (Specialty Coffee) การจองห้องประชุม คอยให้ความช่วยเหลือลูกค้าคาเฟ่ในบรรยากาศผ่อนคลายและสร้างความรู้สึกพึงพอใจประทับใจเสมือนมาเยือนร้านด้วยตัวเอง",
        keyboards: [
          { text: "☕ แนะนำเมล็ดพิเศษวันนี้", response: "วันนี้มีเมล็ดกาแฟดริปพิเศษให้เลือก: เมล็ดกัวเตมาลาคั่วกลางหอมกลิ่นช็อกโกแลตนุ่มนวล หรือเมล็ดเอธิโอเปียคั่วอ่อนรสชาติหวานหอมกลิ่นดอกไม้และพีชอันสดชื่นครับ!" },
          { text: "📶 รายละเอียดอินเทอร์เน็ตแรง", response: "พื้นที่ Co-Working ของเราให้บริการ Wi-Fi ความเร็วสูงพิเศษ 1 Gbps ครอบคลุมทุกที่นั่ง มีเต้าเสียบสายปลั๊กไฟครบทุกจุด และบริการพิมพ์เอกสารขาวดำฟรีคนละ 10 แผ่นครับ!" }
        ],
        autoReplies: [
          { keyword: "พิกัด", reply: "📍 แผนที่ร้านคาเฟ่ของเรา: เดินทางสะดวกจากรถไฟฟ้า BTS สถานีอารีย์ ทางออก 3 มีที่จอดรถรองรับลูกค้าหน้าร้านสูงสุด 10 คันครับ!", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" },
          { keyword: "แผนที่", reply: "📍 ร้านตั้งอยู่ซอยพหลโยธิน 7 เขตพญาไท กรุงเทพมหานคร เปิดบริการทุกวันตั้งแต่เวลา 08:00 ถึง 22:00 น. ยินดีต้อนรับครับ!", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      groupSettings: {
        welcomeNewMember: true,
        welcomeMessage: "🎉 ขอต้อนรับคอกาแฟและคนขยันทำงานคุณ {name} สู่ครอบครัวคาเฟ่ Co-Working Club!\nรับสิทธิ์อินเทอร์เน็ตฟรีทันทีที่ลงทะเบียน อ่านกฎกติกาโดยพิมพ์ /rules นะครับผม",
        antiSpam: {
          blockLinks: true,
          blockSwearWords: true,
          warnLimit: 3
        },
        rulesAnnouncement: "📢 ระเบียบความปลอดภัยและข้อกำหนดการจองห้อง Co-Working:\n- งดการใช้เสียงดังรบกวนผู้อื่นที่กำลังทำงานหรือประชุม\n- ไม่อนุญาตให้นำสัตว์เลี้ยงเข้ามาในโซนทำงานเงียบเพื่อความเป็นระเบียบเรียบร้อยครับ",
        rulesInterval: 1,
        customCommands: [
          { command: "/rules", reply: "⚠️ ข้อบังคับการใช้พื้นที่คาเฟ่ร่วมกัน:\n1. กรุณารักษามารยาทความเงียบในพื้นที่ทำงานสีเขียว\n2. สั่งเครื่องดื่มหรือขนมอย่างน้อยคนละ 1 รายการเพื่อร่วมสนับสนุนพื้นที่\n(หากละเมิดข้อตกลงจะโดนตักเตือนและเชิญออกหากไม่หยุดรบกวนครับ)" }
        ],
        autoTranslation: {
          enable: false,
          targetLanguage: "ภาษาไทย"
        }
      },
      channelSettings: {
        autoSignature: true,
        autoSignatureText: "☕ พักสมองและเติมพลังงานไอเดียทำงานได้ที่ @CafeCoWorkingStation",
        enableFormatting: "MarkdownV2",
        scheduledPosts: [
          { id: "cafe-p1", time: "14:00", content: "☀️ บ่ายๆ แบบนี้ ง่วงนอนกันรึยังครับ? แวะมาเติมพลังงานด้วยอเมริกาโน่เย็นคู่เลมอนทาร์ตแสนสดชื่น ลดพิเศษทันที 20% ถึงบ่าย 4 โมงเย็นนี้นะครับ!", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" }
        ]
      },
      adminPermissions: {
        canDeleteMessages: true,
        canBanUsers: true,
        canPinMessages: true,
        canChangeGroupInfo: true
      },
      privacySettings: {
        allowDirectMessages: true,
        groupPrivacyMode: false,
        showPublicStats: true,
        hideBotCreator: false
      },
      externalApis: {
        webhookUrl: "https://api.coffeecafeworking.com/webhook",
        googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1_cafe_bookings/edit",
        customApiUrl: "",
        apiAuthToken: "",
        sendLeadsToApi: true
      },
      mediaLibrary: [
        {
          id: "cafe-m1",
          name: "แบนเนอร์บรรยากาศคาเฟ่แสนอบอุ่น",
          url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
          type: "image/jpeg"
        }
      ]
    }
  }
];
