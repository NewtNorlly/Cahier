/**
 * polish-law.cjs — 法学文献专属精修（手动精准替换，仅处理“邵科”文献）
 */
const fs = require('fs');

const P = '文献笔记/全球知识产权治理博弈的深层话语构造：中国范式和中国路径_邵科.md';
const s = fs.readFileSync(P, 'utf8');

const REPL = [
  // 半角括号包中文 → 全角括号
  ['( 明)', '（明）'],
  ['( 又称动员)', '（又称动员）'],
  ['( 劳动者)', '（劳动者）'],
  ['( 公域)', '（公域）'],
  ['( 参见前引〔33〕，Carstensen 等文，第321页) 。', '（参见前引〔33〕，Carstensen 等文，第321页）。'],
  ['( 健康卷) ', '（健康卷）'],
  ['( 美国)', '（美国）'],
  ['( 以下简称“最终报告”)', '（以下简称“最终报告”）'],
  ['( 以下简称“调查报告”)', '（以下简称“调查报告”）'],
  ['( 超TRIPS 标准的)', '（超TRIPS 标准的）'],
  ['标准的)知识产权', '标准的）知识产权'],
  // mark 跨界括号空格
  ['(</mark> public domain)', '(</mark>public domain)'],
  // 三连破折号（行内已由 clean 处理，这里兜底）
  ['———', '——'],
  // 已知 URL 残渣精准修复
  ['https://trea-ties.un.org/pages/Resource.aspx? path = Publication/Regulation/Page1 _en.xml',
   'https://treaties.un.org/pages/Resource.aspx?path=Publication/Regulation/Page1_en.xml'],
  ['https://www.dfat.gov.au/trade/agreements/trade -agreements ( 两网址均于2021年5月1日最后访问) 。',
   'https://www.dfat.gov.au/trade/agreements/trade-agreements（两网址均于2021年5月1日最后访问）。'],
  ['https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/179/IP -NGOs% 20final% 20report% 20December% 202006.pdf; jsessionid = 7B887047BCF2294904F78DD5A59D952F? sequence = 2',
   'https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/179/IP-NGOs%20final%20report%20December%202006.pdf?sequence=2'],
  ['https://www.wipo.int/ip -development/en/agenda/',
   'https://www.wipo.int/ip-development/en/agenda/'],
  ['https://balkin.blogspot.com/2006/04/what -is -access -to -knowledge.html',
   'https://balkin.blogspot.com/2006/04/what-is-access-to-knowledge.html'],
  ['https://trumpwhitehouse.archives.gov/wp -content/uploads/2017/11/2018Annual_ IPEC _ Report _ to _ Congress.pdf',
   'https://trumpwhitehouse.archives.gov/wp-content/uploads/2017/11/2018Annual_IPEC_Report_to_Congress.pdf'],
  ['https://www.who.int/publications/10 -year -review/chapter -medicines.pdf',
   'https://www.who.int/publications/10-year-review/chapter-medicines.pdf'],
  ['https://www.wto.org /english /thewto_e /minist_e /min01_e /mindecl_trips_e.htm',
   'https://www.wto.org/english/thewto_e/minist_e/min01_e/mindecl_trips_e.htm'],
  ['https://www.aaas.org/sites/default/files/SRHRL/PDF/IHRDArticle15/E -CN_4 -SUB_2 -RES -2000—7_Eng.pdf',
   'https://www.aaas.org/sites/default/files/SRHRL/PDF/IHRDArticle15/E-CN_4-SUB_2-RES-2000-7_Eng.pdf'],
  ['https://treasury.gov.au /publication /government -response -to -the -competition -policy -review',
   'https://treasury.gov.au/publication/government-response-to-the-competition-policy-review'],
  ['https://phrma.org/-/media/Project/PhRMA/PhRMA -Org/PhRMA -Org/PDF/0—9/PhRMA -2020 -Special -301 -Submission.pdf',
   'https://phrma.org/-/media/Project/PhRMA/PhRMA-Org/PhRMA-Org/PDF/0-9/PhRMA-2020-Special-301-Submission.pdf'],
  ['https://www.dfat.gov.au/sites/default/files/jscot -report.pdf',
   'https://www.dfat.gov.au/sites/default/files/jscot-report.pdf'],
  ['https://www.dfat.gov.au/sites/default/files/government -response -jscot -inquiry -on -tpp -11.pdf',
   'https://www.dfat.gov.au/sites/default/files/government-response-jscot-inquiry-on-tpp-11.pdf'],
  ['https://www.pc.gov.au/inquiries/completed/intellectual -property/report/intellectual -property.pdf',
   'https://www.pc.gov.au/inquiries/completed/intellectual-property/report/intellectual-property.pdf'],
  ['https://www.pc.gov.au/research/ongoing/report -on -government -services/2016/health/rogs -2016 -volume -health.pdf',
   'https://www.pc.gov.au/research/ongoing/report-on-government-services/2016/health/rogs-2016-volume-health.pdf'],
  ['https://www.aph.gov.au/Parliamentary _ Business/Committees/Senate/Former _ Committees/freetrade/report/final/index',
   'https://www.aph.gov.au/Parliamentary_Business/Committees/Senate/Former_Committees/freetrade/report/final/index'],
  ['https://www.wto.org/english/thewto_e/minist_e/min01_e/mindecl_trips_e.htm',
   'https://www.wto.org/english/thewto_e/minist_e/min01_e/mindecl_trips_e.htm'],
  // 批注编号列表分行（用户要求合理分行）
  ['> 本文要干两件事 1. 拆穿西方的玩法——在全球知识产权博弈中的实际 2. 提出中国的方案——怎么"会通而超胜"（先学透再超越）',
   '> 本文要干两件事：\n> 1. 拆穿西方的玩法——在全球知识产权博弈中的实际\n> 2. 提出中国的方案——怎么“会通而超胜”（先学透再超越）'],
  // URL 残留片段（整串 URL 已被空格截断，此处按片段修复）
  ['? path = Publication/Regulation/Page1 _en.xml', '?path=Publication/Regulation/Page1_en.xml'],
  ['IP -NGOs% 20final% 20report% 20December% 202006.pdf; jsessionid = 7B887047BCF2294904F78DD5A59D952F? sequence = 2',
   'IP-NGOs%20final%20report%20December%202006.pdf?sequence=2'],
  ['trade -agreements ( 两网址', 'trade-agreements（两网址'],
  ['E -CN_4 -SUB_2 -RES -2000—7_Eng.pdf', 'E-CN_4-SUB_2-RES-2000-7_Eng.pdf'],
  ['PhRMA -2020 -Special -301 -Submission.pdf', 'PhRMA-2020-Special-301-Submission.pdf'],
  ['/ip -development/en/agenda/', '/ip-development/en/agenda/'],
  ['/2006/04/what -is -access -to -knowledge.html', '/2006/04/what-is-access-to-knowledge.html'],
  ['2018% 20Special% 20301.pdf', '2018%20Special%20301.pdf'],
  ['/2017/11/2018Annual_ IPEC _ Report _ to _ Congress.pdf', '/2017/11/2018Annual_IPEC_Report_to_Congress.pdf'],
  ['/10 -year -review/chapter -medicines.pdf', '/10-year-review/chapter-medicines.pdf'],
  ['/publication /government -response -to -the -competition -policy -review', '/publication/government-response-to-the-competition-policy-review'],
  ['intellectual -property/report/intellectual -property.pdf', 'intellectual-property/report/intellectual-property.pdf'],
  ['report -on -government -services/2016/health/rogs -2016 -volume -health.pdf', 'report-on-government-services/2016/health/rogs-2016-volume-health.pdf'],
  ['jscot -report.pdf', 'jscot-report.pdf'],
  ['government -response -jscot -inquiry -on -tpp -11.pdf', 'government-response-jscot-inquiry-on-tpp-11.pdf'],
  ['Parliamentary _ Business/Committees/Senate/Former _ Committees', 'Parliamentary_Business/Committees/Senate/Former_Committees'],
  ['asset_upload_file813_3398.pdf', 'asset_upload_file813_3398.pdf'],
  ['asset_upload_file298_3385.pdf', 'asset_upload_file298_3385.pdf'],
  // 驼峰误伤与断词残留（第二轮）
  ['Ph RMA', 'PhRMA'],
  ['0—9/PhRMA', '0-9/PhRMA'],
  ['Formof', 'Form of'],
  ['Progressand', 'Progress and'],
  ['Chinain', 'China in'],
  ['Ideas fora Sane', 'Ideas for a Sane'],
  ['B.C.– A.D.2000', 'B.C.–A.D.2000'],
  ['Gaёlle', 'Gaëlle'],
  ['government -response -to -the -competition -policy -review', 'government-response-to-the-competition-policy-review'],
  // 页 19 脚注裸露 → 包进 footnotes div（原 OCR 无 div，正文被脚注插入）
  ['在中国范式来讲，概有两大核心参见郑永年：\n\n《通往大国之路：\n\n中国的知识重建和文明复兴》，东方出版社2012年版，第1页以下。参见邵则宪：\n\n《昭隆传统之大美：\n\n中国文化如何成为全球治理的建构者》，清华大学出版社2019年版，第59页以下。Gaëlle Krikorian, Access to Knowledge as a Field of Activism,载前引<sup class="fn-ref">〔40〕</sup>，Krikorian 等编书，第68页。此洞察见于前引<sup class="fn-ref">〔111〕</sup>，Okediji 文，第235页，第284页；\n\n前引<sup class="fn-ref">〔21〕</sup>，Wills 书，第188页。西方知识产权学界消解西方中心论的诉求，可参见Peter Yu, Intellectual Property and Confucianism,in Irene Calboli &Srividhya Ragavan (eds.),Diversity in Intellectual Property: Identities, Interests,and Intersections, Cambridge: Cambridge University Press,2015,p.253;前引<sup class="fn-ref">〔111〕</sup>，Godoy 书，第105页以下。',
   '在中国范式来讲，概有两大核心\n\n<div class="folio-footnotes">\n<span class="folio-footnotes__label">本页注释</span>\n参见郑永年：《通往大国之路：中国的知识重建和文明复兴》，东方出版社2012年版，第1页以下。\n<br class="fn-break">参见邵则宪：《昭隆传统之大美：中国文化如何成为全球治理的建构者》，清华大学出版社2019年版，第59页以下。\n<br class="fn-break">Gaëlle Krikorian, Access to Knowledge as a Field of Activism,载前引<sup class="fn-ref">〔40〕</sup>，Krikorian 等编书，第68页。\n<br class="fn-break">此洞察见于前引<sup class="fn-ref">〔111〕</sup>，Okediji 文，第235页，第284页；前引<sup class="fn-ref">〔21〕</sup>，Wills 书，第188页。\n<br class="fn-break">西方知识产权学界消解西方中心论的诉求，可参见Peter Yu, Intellectual Property and Confucianism,in Irene Calboli &Srividhya Ragavan (eds.),Diversity in Intellectual Property: Identities, Interests,and Intersections, Cambridge: Cambridge University Press,2015,p.253;前引<sup class="fn-ref">〔111〕</sup>，Godoy 书，第105页以下。\n</div>'],
  // 孤立的 u 标签对（高亮句号无意义）→ 删除
  ['破坏者<u>。<sup class="fn-ref">〔108〕</sup></u>这种思维', '破坏者。<sup class="fn-ref">〔108〕</sup>这种思维'],
  // 英文脚注残渣（第三轮）
  ['较早见于Peter Drahos', '较早见于 Peter Drahos'],
  ['The TRIPSAgreement', 'The TRIPS Agreement'],
  ['Oxford:Oxford University Press', 'Oxford: Oxford University Press'],
  ['et al.(eds.)', 'et al. (eds.)'],
  ['（明） 徐光启', '（明）徐光启'],
  ['(treaty) 。', '(treaty)。'],
  ['官网https://trea-ties.un.org/pages/Resource.aspx? path = Publication/Regulation/Page 1 _en.xml', '官网 https://treaties.un.org/pages/Resource.aspx?path=Publication/Regulation/Page1_en.xml'],
  ['? path = Publication/Regulation/Page 1 _en.xml', '?path=Publication/Regulation/Page1_en.xml'],
  ['&Contemporary', '& Contemporary'],
  ['What is Accessto Knowledge', 'What is Access to Knowledge'],
  ['(1999) ;', '(1999);'],
  ['asset_upload_file813_3398.pdf，last', 'asset_upload_file813_3398.pdf,last'],
  ['asset_upload_file298_3385.pdf，last', 'asset_upload_file298_3385.pdf,last'],
  ['Post-Ch AFTA', 'Post-ChAFTA'],
  ['Intellectual Propertyin the Image', 'Intellectual Property in the Image'],
  ['11,27 (2007)', '11, 27 (2007)'],
  // 英文脚注残渣（第四轮：单空格版本）
  ['10 -year-review/chapter-medicines.pdf', '10-year-review/chapter-medicines.pdf'],
  ['pdf，lastvisited on 2021-05-10', 'pdf,last visited on 2021-05-10'],
  ['/2006/04/what -is-access-to-knowledge.html', '/2006/04/what-is-access-to-knowledge.html'],
  ['(2015) ; 前引', '(2015); 前引'],
  ['report -on-government-services/2016/health/rogs -2016 -volume-health.pdf', 'report-on-government-services/2016/health/rogs-2016-volume-health.pdf'],
  ['Capling &John Ravenhill', 'Capling & John Ravenhill'],
  ['Sign ?,69 (5)', 'Sign?, 69 (5)'],
  ['PhRMA -Org/PhRMA-Org', 'PhRMA-Org/PhRMA-Org'],
  ['government -response-jscot-inquiry-on-tpp -11.pdf', 'government-response-jscot-inquiry-on-tpp-11.pdf'],
  ['有关评述见WHO', '有关评述见 WHO'],
  // 英文脚注残渣（第五轮）
  ['<br class="fn-break">说。\u0007', ''],
  ['Cheltenham:Edward Elgar', 'Cheltenham: Edward Elgar'],
  ['pp.xixii', 'pp.xi-xii'],
  ['Ostrom(eds.)', 'Ostrom (eds.)'],
  ['Property intheir Ideas', 'Property in their Ideas'],
  ['A philosophy of Intellectual Property', 'A Philosophy of Intellectual Property'],
  ['（明） 王夫之', '（明）王夫之'],
  ['minist_e/min 01_e/mindecl_trips_e.htm', 'minist_e/min01_e/mindecl_trips_e.htm'],
  ['agenda/，last visited', 'agenda/,last visited'],
  ['4—7(2004)', '4—7 (2004)'],
];

let out = s;
let count = 0;
for (const [from, to] of REPL) {
  if (out.includes(from)) { out = out.split(from).join(to); count++; }
  else { console.log('NOT-FOUND:', from.slice(0, 60)); }
}
// 兜底：正文中残留的半角括号包中文（( 某中文...) → （某中文））不跨行
out = out.replace(/\( ([《“\u4e00-\u9fff][^()\r\n]{0,24}?)\)/g, '（$1）');
// 英文句末全角句点/中文句号 → 半角（脚注英文句，允许中间一个空格）
out = out.replace(/([A-Za-z0-9)])[^\S\r\n]?[。．]/g, '$1.');
// 英文语境年份前逗号补空格（,2009 → , 2009）
out = out.replace(/([)\d]),(\d{4})(?![-\d])/g, '$1, $2');
// 英文语境分号前空格清理（(2004) ; → (2004);）
out = out.replace(/\) ; /g, '); ');

if (out !== s) { fs.writeFileSync(P, out, 'utf8'); console.log('polished, replaced groups:', count); }
else console.log('no change');
