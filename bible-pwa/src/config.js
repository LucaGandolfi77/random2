const CONFIG = {
  canvas: { width: 860, height: 640 },
  language: 'en',
  books: ['genesis','exodus','psalms','gospels','acts','revelation'],
  chapters: {
    genesis: ['creation','fall','flood','tower','abraham','joseph'],
    exodus: ['egypt','plagues','red_sea','law','wilderness'],
    psalms: ['lament','praise','wisdom','messianic'],
    gospels: ['birth','baptism','ministry','passion','resurrection'],
    acts: ['pentecost','preaching','martyr','journeys'],
    revelation: ['letters','throne','seals','new_jerusalem']
  },
  themes: {
    en: { creation: 'Creation', covenant: 'Covenant', prophecy: 'Prophecy', redemption: 'Redemption', faith: 'Faith', revelation: 'Revelation' },
    it: { creation: 'Creazione', covenant: 'Alleanza', prophecy: 'Profezia', redemption: 'Redenzione', faith: 'Fede', revelation: 'Rivelazione' }
  },
  audio: { masterVolume: 0.55, musicVolume: 0.3 }
};
export default CONFIG;
