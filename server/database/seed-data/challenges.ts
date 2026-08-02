export type SeedChallenge = {
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  text: string
}

const easy = (category: string, text: string): SeedChallenge => ({ category, difficulty: 'easy', text })
const medium = (category: string, text: string): SeedChallenge => ({ category, difficulty: 'medium', text })
const hard = (category: string, text: string): SeedChallenge => ({ category, difficulty: 'hard', text })

const classicCheers = [
  'Order the weirdest drink on the menu tonight.',
  "Try a beer style you've never had before.",
  'Have your drink without checking your phone once.',
  "Order in a language that isn't your own.",
  'Ask the bartender to surprise you.',
  'Pair your drink with the worst possible snack.',
  'Drink something the color of your favorite sports team.',
  "Try a local/regional specialty you've never heard of.",
  "Order a round for the table without being asked.",
  'Guess the ABV of your drink before checking the label.',
  'Have a "reverse happy hour" drink — most expensive thing on the menu.',
  'Try a non-alcoholic version of your usual order.',
  'Drink exclusively from a glass, no bottle/can allowed tonight.',
  "Order something you can't pronounce.",
  'Recreate your first-ever drink order from memory.'
].map((t) => easy('Classic Cheers', t))

const socialButterfly = [
  'Get 3+ friends to join your session tonight.',
  "Start your session somewhere you've never been before.",
  "Invite someone you haven't seen in a month.",
  'Host — pick the spot and get at least one friend to come to you.',
  'Cheers with a stranger at the bar.',
  "Get a friend's friend (someone new) to join the table.",
  'Make a toast out loud before your first sip.',
  'Start a session during "off hours" (before 5pm or after midnight).',
  'Get someone to join who almost said no.',
  'Organize a two-stop crawl with at least one other person.',
  "Bring a friend who's never used the app before.",
  'Send a "cheers from afar" reaction to 3 different sessions today.',
  "Get someone to answer your beer-button notification within 5 minutes.",
  'Meet up with someone from a different friend group than usual.',
  'Close out the night with a group photo at the table.'
].map((t) => medium('Social Butterfly', t))

const triviaAndBrain = [
  'Name the country of origin of your drink before finishing it.',
  "Learn one fun fact about tonight's drink and share it with the table.",
  'Guess how many calories are in your drink, then look it up.',
  'Name 3 other drinks made with the same base spirit/grain.',
  'Explain the difference between an ale and a lager to someone.',
  'Correctly guess the year your bar/venue opened.',
  "Name the glass shape you're drinking from.",
  'Recall and share one piece of "beer trivia" you already know.',
  'Guess the price of your drink before seeing the bill.',
  "Identify one ingredient in your cocktail you can't normally pronounce.",
  "Learn what your drink is called in another language.",
  'Name a movie or song that mentions your drink.',
  "Guess your table's combined drink total before the bill arrives.",
  'Find out what drink is most popular at this venue tonight.',
  'Ask the bartender one question about how your drink is made.'
].map((t) => hard('Trivia & Brain', t))

const creativeAndSilly = [
  'Give tonight\'s drink a nickname and use it all night.',
  'Come up with a toast that rhymes.',
  'Invent a drinking game for the table (nothing risky, just fun).',
  'Describe your drink using only one word.',
  'Draw your drink from memory after finishing it.',
  'Give your session a theme (decade, color, mood) and dress the vibe accordingly.',
  'Come up with a fake "tasting note" description like a sommelier.',
  'Assign each person at the table a "drink personality."',
  "Make up a name for a cocktail that doesn't exist yet.",
  'Do a dramatic "cheers" — over the top, theatrical.',
  "Write a one-line review of tonight's drink.",
  "Pick a song that matches your drink's vibe.",
  'Come up with a toast dedicated to something ridiculous (the weather, a pet, Mondays).',
  "Rate tonight's venue atmosphere out of 10 and defend your score.",
  'Give your bartender a fun nickname for the night (with permission).'
].map((t) => medium('Creative & Silly', t))

const photoOps = [
  'Snap a photo of your drink with the venue in the background.',
  'Get a candid (not posed) group photo tonight.',
  'Photograph your drink next to something unexpected on the table.',
  'Take a "before and after" photo of your glass.',
  'Get a photo of the bartender making your drink (ask first).',
  "Capture the view from wherever you're drinking.",
  'Take a moody, low-light photo of your drink.',
  'Photograph your session pin on the app map as a screenshot memory.',
  'Get a photo cheersing with someone new.',
  'Snap the most colorful drink at the table.',
  "Take a photo of the venue's sign or entrance.",
  'Get a close-up of the foam/garnish/ice — whatever makes this drink unique.',
  'Photograph your "seat with a view" for tonight.',
  'Take a photo mid-laugh at the table.',
  "Capture tonight's table from directly above."
].map((t) => easy('Photo Ops', t))

const adventureAndExploration = [
  "Start your session somewhere within walking distance you've never tried.",
  'Try a venue in a different neighborhood than usual.',
  'Find a spot with an outdoor seating area tonight.',
  'Discover a place with a view (rooftop, waterfront, skyline).',
  'Try the smallest/most hole-in-the-wall bar you can find.',
  "Visit a place that's been open less than a year.",
  'Find a venue with live music or a DJ tonight.',
  "Go somewhere your friends recommended but you've been putting off.",
  "Try a place with a happy hour you've never used.",
  'Start your session somewhere with a name you find funny or interesting.',
  "Explore a venue that serves food you've never tried alongside your drink.",
  'Find the closest active friend-session pin and go join it, wherever it is.',
  'Try a spot more than 20 minutes from home.',
  'Discover a place with a theme (sports bar, speakeasy, tiki, wine bar).',
  'Visit a venue within sight of water, a park, or a landmark.'
].map((t) => medium('Adventure & Exploration', t))

const mindfulAndLowKey = [
  'Do a non-alcoholic session tonight and still hit the challenge.',
  'Have a "slow" drink — take at least 30 minutes on one glass.',
  'Alternate every alcoholic drink with a glass of water.',
  'Set a two-drink limit for the night and stick to it.',
  'Check in on how you\'re feeling before ordering a second round.',
  'Have your session somewhere calm — no loud music, no crowd.',
  "Try a mocktail you've never had.",
  'Make tonight\'s session about the company, not the drink — order last.',
  'Practice one mindful sip — really taste it — before rushing through the glass.',
  'End the night before it gets loud/crowded.',
  'Skip the second round and see how the night unfolds anyway.',
  'Choose a venue with a strong non-alcoholic menu tonight.',
  'Have a glass of water between every drink, no exceptions.',
  'Notice and name one thing you\'re grateful for before your first sip.',
  'Keep tonight to a single, unhurried drink.'
].map((t) => easy('Mindful & Low-key', t))

const wildcardAndRandom = [
  'Let a friend pick your drink for you tonight, no vetoes.',
  'Flip a coin to decide beer or wine before you order.',
  'Order whatever the person before you in line ordered.',
  'Pick your venue based on which one has the best name nearby.',
  "Let the app's daily challenge dictate your whole night's plan.",
  'Order the second-cheapest item on the drink menu, on principle.',
  'Ask the bartender to pick for you based on your mood.',
  'Choose your seat at random (first open one you see, no scouting).',
  "Order something themed to today's day of the week.",
  'Let a friend veto one drink option before you choose from what\'s left.',
  'Try the daily/seasonal special, whatever it is.',
  'Order something you associate with a specific memory or trip.',
  "Pick a drink based on the weather today.",
  "Do a \"reverse order\" — dessert-style drink first if you'd normally end there.",
  "Let the bartender's first suggestion be final, no follow-up questions.",
  'Match your drink choice to the color of something you\'re wearing.',
  'Order based on the coin-flip of "sweet vs. bitter."',
  "Try a drink named after a place you'd like to visit.",
  "Ask a stranger what they're having and order the same.",
  "Close tonight with a toast to tomorrow's challenge, whatever it may be."
].map((t) => medium('Wildcard / Random', t))

export const seedChallenges: SeedChallenge[] = [
  ...classicCheers,
  ...socialButterfly,
  ...triviaAndBrain,
  ...creativeAndSilly,
  ...photoOps,
  ...adventureAndExploration,
  ...mindfulAndLowKey,
  ...wildcardAndRandom
]
