/* Bonsai Days — story, history and care notes.
   Every historical claim here is also listed in the README so it can be checked against sources.
   Line: { who: 'sensei' | 'aoi' | 'you' | 'narr', t: text | {pine, maple, juniper} | (state) => text, j: journal id } */
(function () {
  const BD = window.BD;

  const CHAR = {
    sensei: { name: 'Haruki-sensei', jp: '春樹先生' },
    aoi: { name: 'Aoi', jp: '葵' },
    you: { name: 'You', jp: 'あなた' },
    narr: { name: '', jp: '' },
  };

  const TREE_WORD = { pine: 'black pine', maple: 'maple', juniper: 'juniper' };

  const ERAS = {
    1: { num: 'I', jp: '第一章', title: 'The Woodblock Days', sub: 'From Chinese penjing to the Edo period', style: 'ukiyo-e woodblock' },
    2: { num: 'II', jp: '第二章', title: 'Ink & Motion', sub: 'Earthquake, war and a village of trees · 1868 – 1976', style: "Aoi's manga sketchbook" },
    3: { num: 'III', jp: '第三章', title: 'Light & Pixels', sub: 'Bonsai goes global · 1976 – today', style: "Aoi's digital canvas" },
  };

  const JOURNAL = {
    // care
    'care-water': { cat: 'Care', title: 'When to water', text: 'Water when the surface of the soil starts to dry, not on a fixed timetable. Then water thoroughly, until water runs out of the drainage holes.' },
    'care-outdoor': { cat: 'Care', title: 'Bonsai are outdoor trees', text: 'Pines, maples and junipers are outdoor trees. They need sun, wind, rain and a cold winter rest (dormancy). Kept indoors as houseplants they slowly decline.' },
    'care-sun': { cat: 'Care', title: 'Sunlight', text: 'Black pines and junipers want full sun. Japanese maples enjoy morning sun and some protection from the hottest afternoon sun, which can scorch their thin leaves.' },
    'care-moss': { cat: 'Care', title: 'Moss', text: 'A layer of moss helps hold the soil in place when you water, and adds a feeling of age and calm.' },
    'care-wire': { cat: 'Care', title: 'Wiring', text: 'Copper or aluminium wire is wrapped around young trunks and branches to guide their shape. It must come off before it cuts into the growing bark.' },
    'care-prune': { cat: 'Care', title: 'Prune in small steps', text: 'Trim the shoots that grow out of the silhouette and leave enough foliage for the tree to feed itself. Many small cuts over time are better than one big one.' },
    'care-summer': { cat: 'Care', title: 'Summer heat', text: 'Small pots dry out fast in hot weather. In summer a bonsai may need water more than once a day. Check the soil, not the calendar.' },
    'care-repot': { cat: 'Care', title: 'Repotting', text: 'Young bonsai are repotted every few years, usually in early spring. The roots are trimmed a little and the tree goes into fresh, fast-draining soil.' },
    'care-steps': { cat: 'Care', title: 'Never too much at once', text: 'A tree that loses too much foliage in one session can go into shock. Growers usually remove only a portion at a time and let the tree recover before the next step.' },
    // history
    'hist-penjing': { cat: 'History', title: 'Penjing: tray scenery', text: 'Bonsai grew out of penjing (盆景, "tray scenery"), the Chinese art of creating miniature landscapes with trees and stones in a container.' },
    'hist-tang': { cat: 'History', title: 'A painting from 706 CE', text: 'A wall painting in the tomb of Prince Zhanghuai (Tang dynasty, 706 CE) shows attendants carrying miniature landscapes and plants. It is often cited as one of the earliest depictions of the art.' },
    'hist-japan': { cat: 'History', title: 'Crossing to Japan', text: 'Potted trees reached Japan through contact with China. By the Kamakura period (1185–1333), picture scrolls show potted trees displayed on verandas.' },
    'hist-zen': { cat: 'History', title: 'Monks and patience', text: 'Buddhist monks, including Zen monks, are often credited with spreading the art in Japan. Its values of patience, simplicity and attention echo Zen thought.' },
    'hist-hachinoki': { cat: 'History', title: 'Hachi-no-ki, the Noh play', text: 'In the Noh play "Hachi-no-ki" (The Potted Trees), a poor samurai burns his three treasured potted trees (plum, cherry and pine) to warm a travelling monk, who turns out to be the regent Hōjō Tokiyori.' },
    'hist-edo': { cat: 'History', title: 'The Edo period (1603–1868)', text: 'During the long peace of the Edo period, growing potted plants became popular with samurai and townspeople alike. There were plant fairs, gardening books and woodblock prints full of potted plants.' },
    'hist-word': { cat: 'History', title: 'The word "bonsai"', text: '盆栽 means "tray planting". The word came into common use in the 19th century. Earlier, potted trees were often called hachi-no-ki.' },
    'hist-iemitsu': { cat: 'History', title: "The shōgun's pine", text: 'A Japanese white pine in the Imperial collection in Tokyo is said to have been cared for by Tokugawa Iemitsu (1604–1651), the third Tokugawa shōgun.' },
    'hist-meiji': { cat: 'History', title: 'Meiji and modern Japan', text: 'After 1868, bonsai became a refined pastime of Japan’s political and business elite, and public exhibitions became more common.' },
    'hist-1923': { cat: 'History', title: 'The Great Kantō Earthquake', text: 'On 1 September 1923 a massive earthquake, followed by fires, devastated Tokyo and Yokohama.' },
    'hist-omiya': { cat: 'History', title: 'Ōmiya Bonsai Village', text: 'After the earthquake, bonsai growers from Tokyo moved to Ōmiya (today part of Saitama City), drawn by space, clean air, water and good soil. The bonsai village took shape in the mid-1920s and still exists.' },
    'hist-pots': { cat: 'History', title: 'Pots from China and Tokoname', text: 'Early bonsai pots were imported from China. Japanese kilns, Tokoname among the best known, later became famous for bonsai pots.' },
    'hist-yamaki': { cat: 'History', title: 'The Yamaki Pine', text: 'A Japanese white pine in training since at least 1625 survived the atomic bombing of Hiroshima on 6 August 1945 at the Yamaki family nursery, about 3 km from the hypocentre, sheltered by the nursery walls.' },
    'hist-1976': { cat: 'History', title: 'A gift for 1976', text: 'For the United States Bicentennial in 1976, the Nippon Bonsai Association gave 53 bonsai to the American people. They became the heart of the National Bonsai & Penjing Museum at the U.S. National Arboretum in Washington, D.C.' },
    'hist-yamaki2': { cat: 'History', title: 'A story rediscovered', text: 'Masaru Yamaki donated his family’s pine in 1976. Its survival story only became widely known in 2001, when his grandsons visited the tree in Washington.' },
    'hist-naka': { cat: 'History', title: 'John Naka', text: 'John Yoshio Naka (1914–2004), a Japanese-American teacher in California, helped bring bonsai to the world. His juniper forest "Goshin" (protector of the spirit) is at the National Bonsai & Penjing Museum.' },
    'hist-wbc': { cat: 'History', title: 'World Bonsai Convention', text: 'The first World Bonsai Convention was held in Ōmiya in 1989. In 2017 the 8th World Bonsai Convention returned to Saitama.' },
    'hist-global': { cat: 'History', title: 'Bonsai today', text: 'Today there are bonsai clubs, exhibitions and online communities all over the world, sharing techniques across species and climates.' },
    'hist-museum': { cat: 'History', title: 'Ōmiya Bonsai Art Museum', text: 'In 2010 Saitama City opened the Ōmiya Bonsai Art Museum near the bonsai village. It was described as the first public bonsai museum.' },
    'hist-generations': { cat: 'History', title: 'Passed down', text: 'Bonsai can live for centuries, cared for by generation after generation of keepers. A bonsai is never truly finished.' },
    // design
    'design-styles': { cat: 'Design', title: 'Three styles', text: 'Chokkan (formal upright) grows straight. Moyogi (informal upright) curves gently. Fukinagashi (windswept) leans as if shaped by constant wind.' },
    'design-pots': { cat: 'Design', title: 'Choosing a pot', text: 'A common guideline: unglazed earthy pots for conifers, glazed coloured pots for deciduous and flowering trees. The pot frames the tree like a picture frame.' },
    'design-taper': { cat: 'Design', title: 'Taper', text: 'A trunk that is thick at the base and narrows toward the top makes a small tree look old and large.' },
    'design-nebari': { cat: 'Design', title: 'Nebari', text: 'Nebari is the visible flare of surface roots spreading over the soil. It gives the tree stability and age.' },
    'design-ma': { cat: 'Design', title: 'Ma: negative space', text: 'The empty space between branches is part of the design. Asymmetry, a lopsided triangle outline and room for "birds to fly through" make the tree feel natural.' },
    'design-age': { cat: 'Design', title: 'Branch angle and age', text: 'Branches that sweep downward suggest an old tree weighed down by years and snow. Rising branches suggest youth and energy.' },
    'design-wabisabi': { cat: 'Design', title: 'Wabi-sabi', text: 'An aesthetic that finds beauty in things that are imperfect, impermanent and aged: deadwood, bark, asymmetry.' },
    'design-display': { cat: 'Design', title: 'Tokonoma display', text: 'In a formal display a bonsai is placed in the tokonoma alcove with a hanging scroll and a small accent plant. Together they suggest a season.' },
  };

  const SEASONS = ['spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'spring', 'spring', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'late', 'late'];
  const SEASON_LABEL = ['Early spring', 'Spring', 'Late spring', 'Early summer', 'Summer', 'Midsummer', 'Early spring', 'Late spring', 'Summer', 'Late summer', 'Autumn', 'Autumn', 'Late autumn', 'Late autumn', 'Late autumn'];

  // Caption shown while time passes after day N.
  const PASS = [
    'The afternoon light crosses the floor. The seedling drinks.',
    'Days pass. You keep coming back.',
    'Weeks pass. New needles, new leaves.',
    'The wire holds the trunk like a hand.',
    'Seasons turn. Years begin to pass.',
    'Summer storms come and go.',
    'The roots settle into fresh soil.',
    'The gaps in the branches fill with light.',
    'A quiet season.',
    'Years pass, and the tree thickens.',
    'Autumn deepens.',
    'The first frost silvers the garden wall.',
    'The branches settle into their new angles.',
    'The day of the display arrives.',
    '',
  ];

  const SUN_OPTIONS = [
    { id: 'full', label: 'Full sun, all day', jp: '日向', desc: 'Bright and hot. Strong, compact growth.' },
    { id: 'morning', label: 'Morning sun, afternoon shade', jp: '半日陰', desc: 'Gentle light, cool afternoons.' },
    { id: 'shade', label: 'Bright shade', jp: '日陰', desc: 'Soft light, never direct.' },
  ];
  const STYLE_OPTIONS = [
    { id: 'formal', label: 'Formal upright', jp: '直幹 Chokkan', desc: 'Straight and tall, like a tree alone in a field.' },
    { id: 'informal', label: 'Informal upright', jp: '模様木 Moyogi', desc: 'A gentle S-curve. The most common style.' },
    { id: 'windswept', label: 'Windswept', jp: '吹流し Fukinagashi', desc: 'Bent by years of wind on a cliff or coast.' },
  ];
  const POT_OPTIONS = [
    { id: 'rect', label: 'Unglazed rectangle', jp: '長方鉢', desc: 'Earthy brown clay. Strong and formal.' },
    { id: 'oval', label: 'Cobalt glazed oval', jp: '楕円鉢', desc: 'Soft curves, deep blue glaze.' },
    { id: 'drum', label: 'Celadon drum pot', jp: '太鼓鉢', desc: 'Round, with little studs. Calm and classic.' },
  ];
  const SWEEP_OPTIONS = [
    { id: 'droop', label: 'Sweeping down', jp: '下垂', desc: 'Old and dignified, heavy with years and snow.' },
    { id: 'level', label: 'Level', jp: '水平', desc: 'Calm and steady, like still water.' },
    { id: 'rising', label: 'Reaching up', jp: '上向き', desc: 'Young and full of energy.' },
  ];

  const S = (t) => ({ who: 'sensei', t });
  const A = (t) => ({ who: 'aoi', t });
  const Y = (t) => ({ who: 'you', t });
  const N = (t) => ({ who: 'narr', t });
  const J = (line, j) => Object.assign(line, { j });

  const DAYS = [
    // ---------------- ERA I ----------------
    {
      intro: [
        N('Ōmiya, Saitama. A quiet neighbourhood of gardens north of Tokyo, where bonsai nurseries have stood for a hundred years.'),
        S('Ah, you are the student who keeps looking over my fence. Come in, come in. Looking is how everyone begins.'),
        Y("I've always loved bonsai. But I have no space, no money... and I'd probably kill it."),
        S('Then we share a secret: every keeper has killed a tree. The trees forgive us, slowly. Here.'),
        N({ pine: 'He places a tiny black pine seedling in your hands, its first needles open like a little star.', maple: 'He places a tiny maple seedling in your hands. Two small leaves, each no bigger than a fingernail.', juniper: 'He places a tiny juniper cutting in your hands, a sprig of soft green scales.' }),
        S('It will live here, on my windowsill, and you will visit it. We will call each visit a day. Some days will be long ones.'),
        J(S('First lesson. Touch the soil. When the surface turns dry and pale, it is time to water. Not before. Roots need air as much as water.'), 'care-water'),
        S('And when you water, water fully. Keep pouring until it runs from the holes at the bottom. Hold steady, and stop when the water reaches the roots.'),
      ],
      act: { type: 'water', zone: [0.6, 0.84], tutorial: true },
      after: () => [S('Good. You listened to the tree instead of the clock.')],
    },
    {
      intro: [
        S('Do you know where bonsai began? Not in Japan. In China.'),
        J(S('Over a thousand years ago, Chinese gardeners made penjing, "tray scenery". Whole landscapes in a dish: a tree, rocks, sometimes tiny figures.'), 'hist-penjing'),
        J(S('There is a painting on the wall of a Tang-dynasty tomb, from the year 706, that shows servants carrying little trees and rocks in trays.'), 'hist-tang'),
        A('Grandpa, you are giving the history lecture already? On day two?'),
        S('My granddaughter, Aoi. She draws. She thinks trees are slow.'),
        A('Trees ARE slow. Nice to meet you. So where are you going to keep it? Bonsai aren’t houseplants, you know.'),
        J(S('She is right. Pines, maples, junipers: they are outdoor trees. They need wind, rain and cold winters to rest. My windowsill is only for our lessons. Between visits, your tree lives on the bench outside.'), 'care-outdoor'),
        J(S({ pine: 'A black pine loves the sun. As much as you can give it.', maple: 'A maple’s leaves are thin. The hot afternoon sun can scorch their edges.', juniper: 'A juniper is a mountain tree. It wants bright sun and moving air.' }), 'care-sun'),
        S('Choose its place on the bench.'),
      ],
      act: { type: 'choice', key: 'sun', prompt: 'Where will your tree live outdoors?', options: SUN_OPTIONS },
      after: (st) => {
        const r = {
          pine: { full: 'Yes. The sun will keep its needles short and tight.', morning: 'Hm. It will live, but the needles may grow a little long. That is alright. We learn.', shade: 'Too dark for a pine, I think. Its needles will stretch toward the light. Let us see what it teaches us.' },
          maple: { full: 'Brave! In midsummer the leaf edges may crisp. But the leaves will stay small and the autumn colour strong.', morning: 'Perfect. Gentle mornings, cool afternoons. The leaves will stay fresh.', shade: 'Soft light, big soft leaves. A gentle tree.' },
          juniper: { full: 'Good. Junipers grow dense and strong in the sun.', morning: 'It will do. A little looser, a little paler.', shade: 'In shade a juniper sulks. The foliage will grow sparse, but it will forgive you.' },
        };
        return [S(r[st.species][st.choices.sun])];
      },
    },
    {
      intro: [
        N('Rain in the night. By morning the soil surface is pale again.'),
        J(S('Potted trees crossed the sea to Japan centuries ago, with monks, scholars and envoys returning from China.'), 'hist-japan'),
        J(S('Buddhist monks saw something in them: a whole mountain in a small pot. Patience you can see.'), 'hist-zen'),
        S('There are picture scrolls from the 1300s that show little trees in pots on a veranda. Just like this one.'),
        A('Tell them the Noh play. The one that makes you cry.'),
        J(S('I do not cry. ... Hachi-no-ki. "The Potted Trees." A poor samurai has nothing left but three dwarf trees: plum, cherry and pine.'), 'hist-hachinoki'),
        S('One snowy night a wandering monk asks for shelter. The samurai burns his beloved trees to keep the monk warm.'),
        A('And the monk turns out to be the most powerful man in the country, and he rewards him. Okay. Maybe I cried too.'),
        J(N('Sensei presses a few cushions of moss around the base of the trunk. "It keeps the soil from washing away," he says.'), 'care-moss'),
        S('Today you water by yourself. Remember: until it flows from the bottom.'),
      ],
      moss: true,
      act: { type: 'water', zone: [0.62, 0.82] },
      after: () => [A('Hey, it grew. Like, actually grew.'), S('Of course it grew. You were here.')],
    },
    {
      intro: [
        J(S('In the Edo period, from 1603, Japan was at peace for more than 250 years. Samurai, merchants, ordinary townspeople: everyone grew potted plants.'), 'hist-edo'),
        S('There were plant fairs, gardening books, and woodblock prints full of potted pines. Like the prints on my wall.'),
        A('That’s why this whole place looks like a woodblock print to me.'),
        J(S('Over time people began to say "bonsai", 盆栽, "tray planting".'), 'hist-word'),
        J(S('Now, a decision. Your trunk is still young and soft. With copper wire we can guide it. The shape you choose now, the tree will remember for its whole life.'), 'care-wire'),
        J(S('The red line shows where the wire will lead it. Choose its style.'), 'design-styles'),
      ],
      act: { type: 'choice', key: 'style', prompt: 'Choose a style for the trunk', options: STYLE_OPTIONS, guide: true },
      after: (st) => [
        S({ formal: 'Straight and honest. The hardest style, because there is nowhere to hide.', informal: 'The curve of a river. Movement, but peace.', windswept: 'A tree with a story. Every branch remembers the storm.' }[st.choices.style]),
        S('We will take the wire off before it bites into the bark. Patience, but not too much patience.'),
      ],
    },
    {
      intro: [
        J(S('In the Imperial collection in Tokyo there is a white pine said to have been cared for by the third shōgun, Tokugawa Iemitsu, in the 1600s.'), 'hist-iemitsu'),
        S('Hundreds of years old, and still alive, because keeper after keeper kept watering it. A bonsai is never finished. It is only passed on.'),
        S({ pine: 'Look. Those new candles shooting straight up. If we let them run, the branches grow long and the tree loses its shape.', maple: 'See the long shoots reaching out of the outline? We cut them back to one or two pairs of leaves.', juniper: 'Those long shoots poking out: trim them with scissors, inside the foliage. Never shear a juniper flat like a hedge.' }),
        J(S('Prune in small steps. Only cut what sticks out. A tree needs its leaves to eat.'), 'care-prune'),
      ],
      act: { type: 'prune', n: 3 },
      after: () => [
        S('Good hands. You cut like you are apologising. That is correct.'),
        A('Grandpa, the Edo period ended in 1868. Next comes the earthquake, right? Let me tell that part. I’ll draw it.'),
        S('She will make it a comic book.'),
        A('A MANGA, Grandpa.'),
      ],
    },
    // ---------------- ERA II ----------------
    {
      intro: [
        A('Okay! From here on, I’m telling the story as a manga. Grandpa’s version is too slow.'),
        S('Too slow? It is bonsai.'),
        J(A('1868! The Meiji era! Japan opens up to the world. Politicians and rich collectors go crazy for bonsai, and there are big public exhibitions.'), 'hist-meiji'),
        A('Lots of the best nurseries were in Tokyo. Then: September 1st, 1923.'),
        J(A('The Great Kantō Earthquake.'), 'hist-1923'),
        S('Tokyo burned. Gardens, nurseries... many trees were lost. Many people too.'),
        J(A('Afterwards, some bonsai growers moved out here, to Ōmiya. Space, clean air, good water, good soil. By the mid-1920s it was a whole bonsai village.'), 'hist-omiya'),
        S('My teacher’s teacher came here then, with his trees on a cart. That is why you are standing in Ōmiya today.'),
        J(S('Summer heat. A small pot dries fast. Outside on the bench it may need water twice a day. Today, give it a long drink.'), 'care-summer'),
      ],
      act: { type: 'water', zone: [0.7, 0.88] },
      after: () => [A('Look at it drink! I need to draw this panel.')],
    },
    {
      intro: [
        N('Early spring, a year later. The buds are swelling but not yet open: the right moment to repot.'),
        S('Time to leave the training pot. Your tree is ready for a real bonsai pot.'),
        J(S('The first bonsai pots came from China. Later, Japanese kilns such as Tokoname became famous for them.'), 'hist-pots'),
        A('Grandpa says the pot is the picture frame. Wrong frame, ruined picture.'),
        J(S('A rough rule: earthy unglazed pots for evergreens like pines and junipers, glazed colour for maples and flowering trees. Rules are where you start, not where you end.'), 'design-pots'),
        J(S('We trim the roots a little and give it fresh, gritty soil that drains fast. Now: which pot?'), 'care-repot'),
      ],
      act: { type: 'choice', key: 'pot', prompt: 'Choose a bonsai pot', options: POT_OPTIONS },
      after: (st) => {
        const fit = { pine: 'rect', maple: 'oval', juniper: 'drum' }[st.species];
        const p = st.choices.pot;
        const lines = [];
        if (p === fit) lines.push(S({ rect: 'A classic match. Strength with strength.', oval: 'Blue and green, and in autumn, blue and red. You have an eye.', drum: 'Round and calm. It lets the twisting trunk speak.' }[p]));
        else lines.push(S({ rect: 'Strong and formal. It gives the tree weight.', oval: 'A glazed pot for an evergreen? Unusual. But art is allowed to be unusual.', drum: 'Soft and round. A gentle frame.' }[p]));
        lines.push(A('Ooh. Okay, that looks expensive now.'));
        return lines;
      },
    },
    {
      intro: [
        A('Grandpa, why do all your trees look old, even the small ones?'),
        J(S('Tricks of the eye. First: taper. The trunk is thick at the bottom and thin at the top, like a great old tree.'), 'design-taper'),
        J(S('Second: nebari. Roots that spread over the soil and grip the earth.'), 'design-nebari'),
        S('Third: asymmetry. Not a lollipop. The lowest branch on one side, the next on the other, the apex on top. A lopsided triangle.'),
        J(S('And fourth, the most important: the empty space between branches. We call it ma. Birds must be able to fly through the tree.'), 'design-ma'),
        A('So you’re designing the gaps.'),
        S('Exactly. Now clear the space. Cut the shoots that fill the gaps.'),
      ],
      act: { type: 'prune', n: 4 },
      after: () => [A('Whoa. It looks... bigger? With less?'), S('That is ma.')],
    },
    {
      intro: [
        N('A grey, heavy morning. Sensei is quiet.'),
        A('This is the hardest page to draw.'),
        J(S('In Hiroshima, the Yamaki family ran a bonsai nursery. One of their trees was a Japanese white pine, in training since at least 1625.'), 'hist-yamaki'),
        S('On the 6th of August 1945, the atomic bomb exploded about three kilometres away. The windows shattered. The family survived. The tall nursery walls had protected the trees.'),
        S('The pine survived too. It is still alive today.'),
        A('We’ll get to where it lives now. It’s a good ending, I promise.'),
        S('Water. Even on sad days, the tree is thirsty.'),
      ],
      act: { type: 'water', zone: [0.64, 0.8] },
      overcast: true,
      after: () => [S('Thank you.')],
    },
    {
      intro: [
        J(A('Okay, the good ending! 1976. America turns 200. The Nippon Bonsai Association sends a gift: 53 bonsai.'), 'hist-1976'),
        S('Trees from some of the finest collections in Japan, given to the people of the United States.'),
        A('And one of them was the Yamaki Pine. Masaru Yamaki gave it, but he never told them it had survived Hiroshima.'),
        J(S('Twenty-five years later, in 2001, his grandsons came to Washington to visit it, and the story was finally known. It lives at the National Bonsai & Penjing Museum.'), 'hist-yamaki2'),
        A('A tree that survived the bomb, given as a gift to the country that dropped it. That’s the last panel of my chapter.'),
        S('Peace takes patience too. Now, a few shoots have run wild.'),
      ],
      act: { type: 'prune', n: 3 },
      after: () => [S('Aoi, show our friend your new drawings next time. The ones on the tablet.'), A('Oh, you are NOT ready.')],
    },
    // ---------------- ERA III ----------------
    {
      intro: [
        A('New chapter, new tools! I’m painting on a tablet now. Glow, gradients, light. Look at your tree!'),
        S('It looks like it is made of fireflies.'),
        J(A('After the war, people who had lived in Japan carried bonsai home with them. In California, a Japanese-American teacher named John Naka taught thousands of students.'), 'hist-naka'),
        S('Naka-sensei’s juniper forest, "Goshin", protector of the spirit, stands in that same museum in Washington.'),
        J(A('In 1989 the first World Bonsai Convention was held right here in Ōmiya. In 2017 it came back to Saitama, with visitors from all over the world.'), 'hist-wbc'),
        J(A('And now people post their trees online every day. There are clubs on every continent. Well, maybe not Antarctica.'), 'hist-global'),
        S('The trees are the same. Only the way we gather has changed. Water, please.'),
      ],
      act: { type: 'water', zone: [0.66, 0.8] },
      after: () => [A('Ten points for posture. I’m posting the drip shot.')],
    },
    {
      intro: [
        J(S('In 2010 the city opened a bonsai art museum, a few minutes’ walk from my gate. People come from everywhere to see trees older than their countries.'), 'hist-museum'),
        A('Half of Grandpa’s friends have trees in there. It’s basically his group chat.'),
        S({ pine: 'In autumn we thin the pine: old needles out, strong pairs left, so light can reach inside.', maple: 'The leaves will turn soon. Cut the long shoots, but leave the buds that will open next spring.', juniper: 'Junipers grow strong in autumn. Thin it so the air can move through the foliage.' }),
        J(S('Remember: small steps. Never take too much at once. A tree that loses too much in one day goes into shock.'), 'care-steps'),
      ],
      act: { type: 'prune', n: 4 },
      after: () => [A('Ooh, before-and-after post. Okay, this one is going everywhere.')],
    },
    {
      intro: [
        S('One last big decision. The angle of the branches tells the viewer the tree’s age.'),
        S('Young trees reach up. Old trees let their branches fall, heavy with years and snow.'),
        A('So it’s like... character design. Posture tells you who someone is.'),
        J(S('... Yes. You see? She understands bonsai. She just won’t admit it.'), 'design-age'),
        S('How should your branches sweep?'),
      ],
      act: { type: 'choice', key: 'sweep', prompt: 'Set the final angle of the branches', options: SWEEP_OPTIONS },
      after: (st) => [
        S({ droop: 'Dignified. It looks like it has already seen a hundred winters.', level: 'Calm, like still water. A tree at peace.', rising: 'Full of energy. A young spirit in an old body. I like it.' }[st.choices.sweep]),
        J(S('We call it wabi-sabi: beauty in what is old, imperfect, and passing. Your tree has some now.'), 'design-wabisabi'),
      ],
    },
    {
      intro: [
        N('When you arrive, Sensei is sitting very still, watching the light move across the sill.'),
        S('Some of my trees were old before I was born. Some will be here long after I am gone.'),
        J(S('A bonsai is never owned. It is borrowed: from the keepers before, for the keepers after.'), 'hist-generations'),
        A('Grandpa’s giving me the old white pine. The big one. I have no idea what I’m doing.'),
        S('Neither did I. Neither did my teacher. That is how it works.'),
        S('Today I will only watch. Water it alone.'),
      ],
      act: { type: 'water', zone: [0.68, 0.8] },
      after: () => [S('You did not look at me once. You looked at the soil. Good.')],
    },
    {
      intro: [
        N('Today the tree leaves the windowsill for one afternoon. Aoi has set up a display in the alcove.'),
        J(S('In a formal display the tree sits in the tokonoma, an alcove, with a hanging scroll and a small accent plant. Together they tell the season.'), 'design-display'),
        A((st) => `I’m livestreaming it. Two hundred people in eleven countries are watching your ${TREE_WORD[st.species]} right now. No pressure.`),
        S('One last trim before the guests arrive. Only what is necessary.'),
      ],
      act: { type: 'prune', n: 2 },
      after: (st) => [
        S('There. Look at it. When you came here, it was a promise in your hand.'),
        S(`Now it is a ${TREE_WORD[st.species]} with a story. And the story is yours.`),
      ],
    },
  ];

  BD.story = { CHAR, ERAS, JOURNAL, DAYS, SEASONS, SEASON_LABEL, PASS, TREE_WORD };
})();
