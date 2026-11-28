// Home, Plastics, Tyres and E-waste pages: text, sources and charts. Data: data/stories.json (pipeline/build_stories.py).
// ---------------- page footer: last updated, cite this page, credits ----------------
function renderFoot(DATA_BUILT){
  const PAGES={home:{name:null,url:"https://globalwastetrade.org/",refs:"h-refs"},plastics:{name:"Plastics",url:"https://globalwastetrade.org/plastics.html",refs:"p-refs"},tyres:{name:"Used tyres and rubber",url:"https://globalwastetrade.org/tyres.html",refs:"t-refs"},ewaste:{name:"E-waste trade",url:"https://globalwastetrade.org/ewaste.html",refs:"e-refs"}};
  const M=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fmt=d=>`${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const now=new Date();
  document.querySelectorAll(".pfoot").forEach(f=>{
    const P=PAGES[f.dataset.page];
    const upd=new Date([f.dataset.updated,DATA_BUILT].sort().pop()+"T00:00:00Z");
    const yr=upd.getUTCFullYear();
    const html=P.name
      ?`Cook, E. (${yr}) '${P.name}', <i>Global Waste Trade Data Hub</i>. Last updated ${fmt(upd)}. Available at: ${P.url} (Accessed: ${fmt(now)}).`
      :`Cook, E. (${yr}) <i>Global Waste Trade Data Hub</i>. Last updated ${fmt(upd)}. Available at: ${P.url} (Accessed: ${fmt(now)}).`;
    f.innerHTML=`<div><h2>Last updated</h2><p class="upd"><time datetime="${upd.toISOString().slice(0,10)}">${fmt(upd)}</time></p>
      <h2>Cite this page</h2><div class="cite">${html}</div><button type="button" class="copy">Copy citation</button></div>
      <div><h2>Credits</h2><dl>
        <div><dt>Created by</dt><dd><a href="about.html">Ed Cook</a></dd></div>
        <div><dt>Data</dt><dd><a href="about.html#src-comtrade">UN Comtrade</a></dd></div>
        <div><dt>Income groups</dt><dd><a href="about.html#src-wb-income">World Bank historical classifications</a></dd></div>
        <div><dt>Sources</dt><dd><a href="#${P.refs}">Sources for this page</a></dd></div>
        <div><dt>Built with</dt><dd>Claude, by Anthropic</dd></div>
        <div><dt>Licence</dt><dd><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener license">CC BY 4.0</a></dd></div>
        <div><dt>Questions or feedback</dt><dd><a href="mailto:ed@globalwastetrade.org">ed@globalwastetrade.org</a></dd></div>
      </dl></div>`;
    f.querySelector('a[href="#'+P.refs+'"]').onclick=e=>{e.preventDefault();document.getElementById(P.refs).scrollIntoView({behavior:"smooth"})};
    const btn=f.querySelector(".copy"), txt=f.querySelector(".cite").textContent;
    btn.onclick=async()=>{try{await navigator.clipboard.writeText(txt);btn.textContent="Copied"}catch(e){const r=document.createRange();r.selectNodeContents(f.querySelector(".cite"));const sel=getSelection();sel.removeAllRanges();sel.addRange(r);btn.textContent="Selected, press Ctrl+C"}setTimeout(()=>btn.textContent="Copy citation",2000)};
  });
}
renderFoot("");

// ---------------- sources ----------------
const REFS={
gwt:{t:"Cook, E. (2026) Global Waste Trade Data Hub. Figures from UN Comtrade, 2008 to 2026, cleaned, with imputed values for countries that did not report. 2025 is partly and 2026 fully modelled.",u:"https://globalwastetrade.org/"},
shares:{t:"Cook, E. (2026) Global Waste Trade Data Hub: About, plastic shares of other wastes, with the source of each share.",u:"https://globalwastetrade.org/about.html#embedded-plastic"},
comtrade:{t:"United Nations (2026) UN Comtrade Database. New York: United Nations Statistics Division. (Accessed: 25 November 2026).",u:"https://comtradeplus.un.org"},
wb:{t:"World Bank (2026) World Bank Country and Lending Groups: Historical Classification by Income. Washington, DC: World Bank. (Accessed: 25 November 2026).",u:"https://ddh-openapi.worldbank.org/resources/DR0095334/download"},
china2017:{t:"World Trade Organization (2017) Notification G/TBT/N/CHN/1211: Solid wastes. Committee on Technical Barriers to Trade, 18 July 2017.",u:"https://apps1.unep.org/resolutions/uploads/2017-world_trade_organization-chn1211_1.pdf"},
waste360:{t:"Bodamer, D. (2017) 'China notifies WTO of intent to ban 24 types of solid waste imports', Waste360, 19 July.",u:"https://www.waste360.com/waste-recycling/china-notifies-wto-of-intent-to-ban-24-types-of-solid-waste-imports"},
china2020:{t:"Ministry of Ecology and Environment of the People's Republic of China et al. (2020) Announcement on the comprehensive ban on the import of solid waste, effective 1 January 2021. Summarised in: IEA (2021) Policies database.",u:"https://www.iea.org/policies/21296"},
brooks:{t:"Brooks, A.L., Wang, S. and Jambeck, J.R. (2018) 'The Chinese import ban and its impact on global plastic waste trade', Science Advances, 4(6), eaat0131.",u:"https://doi.org/10.1126/sciadv.aat0131"},
basel:{t:"UNEP (1989) Basel Convention on the Control of Transboundary Movements of Hazardous Wastes and their Disposal. Geneva: Secretariat of the Basel Convention.",u:"https://www.basel.int/TheConvention/Overview/tabid/1271/Default.aspx"},
baselP:{t:"Secretariat of the Basel Convention (2019) Basel Convention Plastic Waste Amendments (decision BC-14/12), adopted May 2019, in effect from 1 January 2021.",u:"https://www.basel.int/Implementation/Plasticwaste/Amendments/Overview/tabid/8426/Default.aspx"},
wco:{t:"World Customs Organization (2020) 'New international rules for import and export of plastic waste come into effect on 1 January 2021', WCO News, December.",u:"https://www.wcoomd.org/en/media/newsroom/2020/december/new-international-rules-for-import-and-export-of-plastic-waste-come-into-effect-on-1-january-2021.aspx"},
baselE:{t:"Secretariat of the Basel Convention (2022) Basel Convention E-waste Amendments, adopted at COP-15 in June 2022, in effect from 1 January 2025.",u:"https://www.basel.int/Implementation/Ewaste/EwasteAmendments/Overview/tabid/9266/Default.aspx"},
euwsr:{t:"European Parliament and Council of the European Union (2024) Regulation (EU) 2024/1157 of 11 April 2024 on shipments of waste. Official Journal of the European Union, L series.",u:"https://eur-lex.europa.eu/eli/reg/2024/1157/oj"},
ecplastic:{t:"European Commission (2026) Plastic waste shipments. Brussels: Directorate-General for Environment. (Accessed: 27 November 2026).",u:"https://environment.ec.europa.eu/topics/waste-and-recycling/waste-shipments/plastic-waste-shipments_en"},
velis2021:{t:"Velis, C.A. and Cook, E. (2021) 'Mismanagement of plastic waste through open burning with emphasis on the Global South: a systematic review of risks to occupational and public health', Environmental Science & Technology, 55(11), pp. 7186–7207.",u:"https://doi.org/10.1021/acs.est.0c08536"},
cook2022:{t:"Cook, E., Velis, C.A. and Cottom, J.W. (2022) 'Scaling up resource recovery of plastics in the emergent circular economy to prevent plastic pollution: assessment of risks to health and safety in the Global South', Waste Management & Research, 40(12), pp. 1680–1707.",u:"https://doi.org/10.1177/0734242X221105415"},
bishop:{t:"Bishop, G., Styles, D. and Lens, P.N.L. (2020) 'Recycling of European plastic is a pathway for plastic debris in the ocean', Environment International, 142, 105893.",u:"https://doi.org/10.1016/j.envint.2020.105893"},
orfound:{t:"The Or Foundation (2024) Stop Waste Colonialism. The Or Foundation. (Accessed: 27 November 2026).",u:"https://stopwastecolonialism.org/stop-waste-colonialism/"},
manieson:{t:"Manieson, L.A. and Ferrero-Regis, T. (2023) 'Castoff from the West, pearls in Kantamanto? A critique of second-hand clothes trade', Journal of Industrial Ecology, 27(3), pp. 811–821.",u:"https://doi.org/10.1111/jiec.13238"},
aperkoh:{t:"Aperkoh, P. and Perry, P. (2026) 'The final stop in the fast fashion supply chain: waste management practices in Ghana's second-hand clothing trade', in Hannibal, C., Perry, P. and Benstead, A.V. (eds) De Gruyter Handbook of Fashion Supply Chains and Operations. Berlin: De Gruyter, pp. 207–224.",u:"https://doi.org/10.1515/9783111384771-015"},
cottom:{t:"Cottom, J.W., Cook, E. and Velis, C.A. (2024) 'A local-to-global emissions inventory of macroplastic pollution', Nature, 633(8028), pp. 101–108.",u:"https://doi.org/10.1038/s41586-024-07758-6"},
waw3:{t:"Cook, E., Ionkova, K., Bhada-Tata, P., Yadav, S. and van Woerden, F. (2026) What a Waste 3.0: Global Snapshot of Solid Waste Management Toward Circularity until 2050. Urban Development Series. Washington, DC: World Bank. doi:10.1596/978-1-4648-2309-1.",u:"https://doi.org/10.1596/978-1-4648-2309-1"},
interpol:{t:"INTERPOL (2020) Strategic analysis report: emerging criminal trends in the global plastic waste market since January 2018. Lyon: INTERPOL, August.",u:"https://www.interpol.int/en/News-and-Events/News/2020/INTERPOL-report-alerts-to-sharp-rise-in-plastic-waste-crime"},
balde2022:{t:"Baldé, C.P., D'Angelo, E., Luda, V., Deubzer, O. and Kuehr, R. (2022) Global Transboundary E-waste Flows Monitor – 2022. Bonn: United Nations Institute for Training and Research (UNITAR).",u:"https://ewastemonitor.info/wp-content/uploads/2022/06/Global-TBM_webversion_june_2_pages.pdf"},
lysaght:{t:"Lysaght, O., Forti, V., Bel, G. et al. (2026) E-waste Statistics: Guidelines on Classifications, Reporting and Indicators. 3rd edn. Bonn: UNITAR SCYCLE.",u:"https://doi.org/10.5281/zenodo.18328494"},
gem:{t:"Baldé, C.P., Kuehr, R., Yamamoto, T., McDonald, R. et al. (2024) Global E-waste Monitor 2024. Geneva and Bonn: International Telecommunication Union and United Nations Institute for Training and Research.",u:"https://www.itu.int/pub/D-GEN-E_WASTE.01-2024"},
pip:{t:"Odeyingbo, O., Nnorom, I. and Deubzer, O. (2017) Person in the Port Project: Assessing Import of Used Electrical and Electronic Equipment into Nigeria. Bonn: UNU-ViE SCYCLE and BCCC Africa.",u:"https://collections.unu.edu/view/UNU:6349"},
eurostat:{t:"Eurostat (2026) EU trade since 1988 by HS2-4-6 and CN8 (DS-045409). Luxembourg: Eurostat. (Accessed: 25 November 2026).",u:"https://ec.europa.eu/eurostat/web/international-trade-in-goods/database"},
hmrc:{t:"HM Revenue & Customs (2026) UK Trade Info: overseas trade statistics. London: HMRC. (Accessed: 25 November 2026).",u:"https://www.uktradeinfo.com"},
smep:{t:"Wang, J. and Wang, R. (2026) Trade in Secondhand Clothing: Analysis of Markets in Uganda, the United Republic of Tanzania and the United States of America. Sustainable Manufacturing and Environmental Pollution (SMEP) Programme and UN Trade and Development (UNCTAD).",u:"https://smepprogramme.org/wp-content/uploads/2026/07/SMEP-UNCTAD-Trade-in-Secondhand-Clothing-Full-Study.pdf"},
giz:{t:"Engelhardt, C., Berste, E. and Kölsch, F. (2024) Assessment study: used textiles at Kantamanto market. Bonn and Eschborn: Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ), for the German Federal Ministry for Economic Cooperation and Development, May. Copy hosted by Humana People to People Austria.",u:"https://humana.at/wp-content/uploads/2024/08/humana-people-to-people-oesterreich-giz-studie-used-textiles-at-kantamanto-market-mai-2024-01.pdf"},
oxford:{t:"Oxford Economics (2024) The socioeconomic impact of second-hand clothes in Africa and the EU27+. Report for Humana People to People and Sympany+, 12 November.",u:"https://www.oxfordeconomics.com/resource/the-socioeconomic-impact-of-second-hand-clothes-in-africa-and-the-eu27/"},
ea:{t:"Environment Agency (2025) The Environment Agency's regulation of waste pneumatic tyres and their export: internal review, final report (redacted). Bristol: Environment Agency.",u:"https://www.gov.uk/government/publications/the-environment-agencys-regulation-of-waste-pneumatic-tyres-and-their-export"},
niti:{t:"Verma, A., Gandhi, P., Anand, A., Bhattacharya, S. and Jash, A. (2026) Enhancing Circular Economy of Waste Tyres in India. New Delhi: NITI Aayog, with TERI.",u:"https://www.niti.gov.in/sites/default/files/2026-01/Enhancing-Circular-Economy-of-Waste-Tyres-in-India.pdf"},
cse:{t:"Centre for Science and Environment (2025) Waste-Tyre Dialogue: A Review of Pathways and Regulatory Gaps. New Delhi: CSE.",u:"https://www.cseindia.org/waste-tyre-dialogue-a-review-of-pathways-and-regulatory-gaps-12796"},
sop2015:{t:"Ministry of Environment, Forest and Climate Change (2015) Standard Operating Procedures with regard to recycling from waste pneumatic tyres and recovery of TPO from tyre scrap. Office Memorandum F. No. 23-61/2015-HSMD, 24 November.",u:"https://cpcb.nic.in/uploads/Projects/Hadzardous-Waste/SOPs_Recycling_waste.pdf"},
cpcb:{t:"Central Pollution Control Board (2021) Interim report on study of advance batch automated tyre pyrolysis plants in the matter of O.A. No. 400 of 2019 (Social Action for Forest & Environment v. Union of India). Report to the National Green Tribunal.",u:"https://www.greentribunal.gov.in/sites/default/files/news_updates/Interim%20Report%20in%20O.A%20No.%20400%20of%202019%20(Social%20Action%20Forest%20for%20&%20Environment%20(SAFE)%20Vs.%20Union%20of%20India%20&%20Ors.).pdf"},
ngt2022:{t:"Central Pollution Control Board (2025) Response in E.A. No. 39 of 2023 in O.A. No. 400 of 2019 (Social Action for Forest & Environment v. Union of India), 30 April. Filing to the National Green Tribunal.",u:"https://www.greentribunal.gov.in/sites/default/files/news_updates/Response%20by%20CPCB%20in%20EA%20No%2039%20of%202023%20IN%20OA%20No%20400%20of%202019%20(SAFE%20vs%20UOI%20&%20Ors.).pdf"},
khan:{t:"Khan, W., Shyamal, D.S. and Kazmi, A.A. (2024) 'Management of end-of-life tyres in India: current practices, regulatory framework, challenges, and opportunities', Journal of Material Cycles and Waste Management, 26(3), pp. 1310–1325.",u:"https://doi.org/10.1007/s10163-024-01937-3"},
tex:{t:"Textile Exchange (2023) Materials Market Report 2023. Textile Exchange.",u:"https://textileexchange.org/knowledge-center/reports/materials-market-report-2023/"},
oecd:{t:"OECD (2022) Global Plastics Outlook: Economic Drivers, Environmental Impacts and Policy Options. Paris: OECD Publishing.",u:"https://doi.org/10.1787/de747aef-en"},
ger:{t:"Gerassimidou, S., Velis, C.A., Williams, P.T. and Komilis, D. (2020) 'Characterisation and composition identification of waste-derived fuels obtained from municipal solid waste using thermogravimetry: a review', Waste Management & Research, 38(9), pp. 942–965.",u:"https://doi.org/10.1177/0734242X20941085"}
};

// ---------------- text (Ed's words, edited; [[ref|note]] marks a citation) ----------------
const TEXT={
"h.lede":[
"Every year more than 180 million tonnes of waste are traded between countries.[[gwt|2023: 182 Mt by exporters' reports and 188 Mt by importers' reports: metals, paper and card, textiles, plastic scrap, rubber and tyres, and e-waste.]] Most of it is bought by businesses in the receiving countries, which extract value by recycling or recovering energy. In 2023 this trade was worth more than US$140 billion,[[gwt|2023: US$144 billion by exporters' reports, US$163 billion by importers' reports.]] around 0.6 to 0.7% of all goods traded by value.[[comtrade|All goods traded in 2023: US$22.8 trillion of exports and US$23.3 trillion of imports, the sum of every reporter's total (commodity code TOTAL).]] Waste exports enable smaller or less industrialised countries to recycle materials they cannot reprocess within their own borders, supporting the circular economy."],
"h.why":[
"Wealthier countries have also used the international waste trade to outsource recycling to countries where labour is cheaper. It has enabled them to raise their recycling collection rates without building reprocessing capacity of their own.",
"Until 2020, China was the world's largest importer of paper and card for recycling, receiving 28.5 million tonnes in 2016.[[gwt|China's imports of recovered paper (HS 4707), importers' reports.]] Much of it became packaging for the vast quantities of goods China made and exported, often to the same high-income countries that had sent it the fibre in the first place. Since China banned all solid waste imports in 2021,[[china2020]] India has become the largest importer, receiving 7.8 million tonnes in 2023.[[gwt|India's imports of recovered paper (HS 4707), importers' reports, 2023.]]"],
"h.risks":[
"Despite the benefits, the international trade has substantial potential drawbacks. Receiving countries may not have the capacity to manage or regulate sorting, reprocessing and recovery facilities.[[interpol|Since China's 2018 ban, difficulties in treating and monitoring the plastic waste surplus have opened doors to illegal trade and illegal waste treatment.]][[waw3]] Material rejected during recycling may be mismanaged: burned, dumped on land or thrown into waterways and coastal waters.[[bishop|Estimates how much of the polyethylene the EU exports for recycling ends up in the ocean.]] Some countries with tough regulations may also exploit poorer countries that are willing to treat or dispose of hazardous waste more cheaply.[[basel]]"],
"h.rules":[
"The Basel Convention on the Control of Transboundary Movements of Hazardous Wastes and their Disposal has sought to address many of these shortcomings by restricting trade in hazardous waste.[[basel]] In 2019 its parties agreed that most plastic waste, the mixed and contaminated kinds most likely to cause environmental damage when mismanaged, can only be exported with the receiving country's prior consent. That rule took effect in 2021,[[baselP]][[wco]] and it has applied to all e-waste since 2025.[[baselE]] The EU has also responded: from November 2026 it bans exports of plastic waste to non-OECD countries.[[euwsr]][[ecplastic]]"],
"h.plastics":[
"Restrictions on the international waste trade have historically re-routed material. When China brought in a near-total ban on plastic waste imports in 2018,[[china2017]] some of that trade moved to businesses in Malaysia, Vietnam, Indonesia and Thailand.[[brooks]][[gwt|Plastic scrap (HS 3915) by destination, 2008 to 2026.]] More recent restrictions have increased trade to Turkey, which now receives about 0.7 million tonnes of plastic scrap a year in customs-documented trade, and about 1.3 million tonnes counting the plastic in tyres, rubber, textiles and paper, mostly from European countries.[[gwt|Turkey, 2025: plastic scrap 0.68 Mt by exporters' reports, 0.70 Mt by Turkey's own (87% from Europe and Central Asia); all plastic 1.27 Mt and 1.31 Mt (90%), of which tyres and rubber 0.50 Mt. 2025 is partly modelled.]][[shares]] Because Turkey is an OECD country, the EU's ban does not apply, despite the high levels of mismanagement there.[[waw3]][[cottom]][[ecplastic]]",
"Plastic scrap is not the only plastic traded. Counting the plastic in used clothing, tyres and rubber, refuse-derived fuel, e-waste and paper bales more than doubles the total, to around 16 million tonnes in 2023.[[gwt|2023, exporters' reports: 7.0 Mt of plastic scrap; 16.4 Mt including embedded plastic.]][[shares]]"],
"h.hidden":[
"The legal waste trade can be monitored through customs declarations. Some countries publish these in national or regional databases,[[eurostat|Regional: the EU's 27 members.]][[hmrc|National: the UK.]] and many upload them to UN Comtrade, a statistical repository of globally traded goods.[[comtrade]] But there is likely to be a substantial illegal trade too.[[interpol]] Some waste is shipped under the wrong commodity code, passed off as non-waste or as reusable second-hand goods when it no longer works.[[gem|Misclassification, misdeclaration and fraud are among the most prevalent strategies for illegal shipments of e-waste, and trade codes do not distinguish new from used equipment (p. 43). Uncontrolled shipments may be 33 to 70% e-waste declared as used goods (p. 40).]] The e-waste trade has long been criticised for exploiting this weakness: supposedly functioning appliances are shipped to West Africa,[[pip|Nigeria, 2015 and 2016: about 60,000 tonnes a year of used electrical and electronic equipment imported, much of it stuffed inside imported used vehicles. At least 19% of the 760 devices tested did not work.]] where they are stripped for components and metals by harmful methods such as burning or leaching with acids.[[gem|Informal recyclers use burning, leaching and melting; the report illustrates acid leaching and burning of cables and plastics (p. 37). It puts e-waste shipped through uncontrolled, undocumented movements at 3.3 million tonnes (p. 17).]]",
"Textile exports have also been controversial, with mixed reports. Several studies have found large quantities of imported textiles being mismanaged in Ghana.[[manieson]][[orfound|The Or Foundation estimates that 40% of the average bale goes unsold and leaves Kantamanto market as waste. The page does not give the method behind the estimate.]] Others highlight the substantial benefit to the local economy, and the affordable clothing imports provide for people who cannot buy new.[[smep|Uganda and Tanzania, 2024: of 244,500 items sampled from imported bales, 96% could be worn again, 2.9 to 3.2% were rags and 1.1 to 1.3% were waste. In Uganda a second-hand item cost 1.56 days' disposable income, against up to six days for new clothing.]][[giz|Kantamanto market, 2024: a paid collection campaign gathered about 26.5 tonnes of textile waste a week, almost 10% of the 300 tonnes traded there, or about 18% with the authors' safety factor of two. The authors say earlier estimates assumed 35-tonne truckloads, where a full truck weighed about 4 tonnes.]][[oxford]][[aperkoh]]"],
"h.about":[
"The global waste trade has attracted considerable attention, controversy, misinformation and even some disinformation in recent years. The Global Waste Trade Data Hub was created to make waste trade data easy to access and analyse, so that practitioners and policy-makers can be confident they are working with the latest and most reliable figures.",
"Most of the data on this site comes from legally documented trade reported to UN Comtrade,[[comtrade]] supplemented with national and regional datasets from Eurostat and the UK's HM Revenue & Customs.[[eurostat]][[hmrc]] The most recent years and months include modelled estimates, to give as current a picture as possible. The <a href='validation.html'>Validation page</a> checks the site's figures against 49 figures from published studies and official statistics, and 46 of them agree to within 10%.",
"The analysis also reveals 'hidden' or 'embedded' materials that may have been shipped under another category. Plastic makes up a substantial share of textile waste and e-waste, for example, so the site estimates how much plastic is likely to be traded within them.[[shares]]",
"Every assumption is set out on the <a href='about.html'>About page</a> and can be changed in the <a href='explorer.html'>Explorer</a>, so you can re-analyse any data stream yourself. If you have more information about the waste trade, or would like to see changes, please <a href='mailto:ed@globalwastetrade.org'>get in touch</a>."],


"p.intro":[
"Plastic scrap (<span class='hs' tabindex='0' role='button' data-tip='Harmonized System (HS) code 3915: waste, parings and scrap of plastics. The Harmonized System is the international list of codes that customs authorities use to classify traded goods.'>HS 3915</span>) is only part of the plastic that is traded internationally. Used clothing, tyres and rubber, refuse-derived fuel, e-waste and bales of paper all contain plastic too. When we account for this, it more than doubles the total amount of plastic waste traded.[[gwt|2023, exporters' reports: 7.0 Mt of plastic scrap; 16.4 Mt including embedded plastic.]][[shares]]"],
"p.history":[
"Until 2017, China and Hong Kong received around two thirds of the world's plastic scrap.[[gwt|2016: 67% by exporters' reports, 68% by importers' reports.]] China alone had received 45% of the world's plastic waste imports since 1992.[[brooks]] In July 2017 it informed the World Trade Organization that it would stop importing plastic waste by the end of the year.[[china2017]][[waste360]] World trade in plastic scrap halved between 2016 and 2019,[[gwt|Exporters' reports: 15.5 Mt in 2016, 7.9 Mt in 2019.]] and what was left moved to countries such as Malaysia, Vietnam, Indonesia and Thailand, and later to Turkey."],
"p.riskkey":["Uncontrolled waste: proportion of municipal solid waste uncollected or sent to uncontrolled disposal in each income group, 2022[[waw3|Figure 2.13a: municipal solid waste managed in controlled facilities (SDG 11.6.1), projected to 2022, weighted mean: low-income 3%, lower-middle-income 27%, upper-middle-income 82%, high-income 99%. Uncontrolled waste is the remainder: 97%, 73%, 18% and 1%.]]"],
"p.hic":[
"Each year around 4 million tonnes of plastic scrap are traded between high-income countries, or 7.6 million tonnes counting the plastic embedded in other wastes.[[gwt|2025, resolved: 3.96 Mt of plastic scrap and 7.59 Mt including embedded plastic. 2025 is partly modelled.]][[shares]] Most of it is likely to be managed responsibly by the recipients: high-income countries treat 99% of their municipal solid waste in controlled facilities.[[waw3|Figure 2.13a, SDG 11.6.1, 2022.]] This trade helps countries balance their reprocessing capacity, and lets richer countries take advantage of the lower costs of less affluent but well-regulated neighbours.",
"When plastic waste is exported to middle- and low-income countries, there is a greater risk that sorting residues will not be managed safely and that reprocessing will not be regulated. Some of these countries lack well-resourced, independent environmental and safety regulators, so high-risk processes may run below safe operating standards.[[cook2022|Rapid assessment of 15 plastic reprocessing operations in the Global South from video footage; the authors did not estimate how common the practices are.]] Between 18% and 97% of municipal solid waste in these countries is uncollected or goes to uncontrolled disposal, against 1% in high-income countries.[[waw3|Figure 2.13a, 2022: upper-middle-income 18%, lower-middle-income 73%, low-income 97%.]] Rejects from sorting are at risk of being burned in open, uncontrolled fires, dumped on land or discharged into waterways. An estimated 3% of the polyethylene Europe exported for recycling in 2017, 83,000 tonnes, ended up in the ocean.[[bishop|Central estimate 83,187 tonnes; range 32,115 to 180,558 tonnes, or 1 to 7%. Europe here means the EU-28, Norway and Switzerland.]]"],
"p.hic2":[
"The impacts of open burning are considerable. Around 2 billion people have no waste collection, and many burn their discarded plastic in open, uncontrolled fires.[[velis2021]] Open burning of waste has been linked to an estimated 270,000 premature deaths a year worldwide,[[velis2021|Citing Kodros et al. (2016).]] and a systematic review of the evidence found an overwhelmingly high risk of harm to the estimated 11.4 million waste pickers who work close to waste fires, often without protective equipment.[[velis2021]] In the Global South most plastic pollution comes from uncollected waste, and rejects from recycling account for about 1 million of the 52 million tonnes emitted worldwide each year.[[cottom|2020: 52.1 Mt of plastic emitted, 57% open burned and 43% as unburned debris. Uncollected waste is 68% of emissions in the Global South; rejects from recycling 1.0 Mt.]] But that pollution falls on the communities that receive the waste.",
"The total mass of plastic traded worldwide masks the flows most likely to damage human health and the environment. Looking only at exports from high-income to middle- and low-income countries shows the true scale of the problem.",
"Counting plastic scrap alone, high-income countries now send less than a third of what they did before China's ban: 2.2 million tonnes in 2025, against 7.6 million tonnes in 2016. Counting the <a href='about.html#embedded-plastic'>plastic in tyres, clothing and other wastes</a>, the fall is much smaller: 8.8 million tonnes in 2025, against 11.3 million tonnes in 2016.[[gwt|Resolved, including Hong Kong's exports, much of them re-exports to mainland China. Exporters' reports: 7.7 to 2.3 Mt of plastic scrap and 11.2 to 8.2 Mt including embedded plastic; importers' reports: 7.3 to 2.0 Mt and 11.1 to 9.0 Mt. 2025 is partly modelled.]][[shares]][[wb]]"],
"p.receivers":[
"India, Turkey and Malaysia are now the largest middle-income receivers. India mostly takes tyres and used clothing. Turkey takes plastic scrap and tyres in roughly equal amounts, and Malaysia mostly takes plastic scrap.[[gwt|2023, exporters' reports. India 1.6 Mt, Turkey 1.1 Mt, Malaysia 1.0 Mt of plastic including embedded plastic.]]",
"Turkey is now the largest single destination for plastic scrap, most of it from Europe.[[gwt|2025, exporters' reports: 0.68 Mt, 87% from Europe and Central Asia.]]"],
"t.intro":[
"Used tyres and rubber are the fastest-growing part of the international plastics trade. India's imports rose from almost nothing in 2008 to 1.9 million tonnes in 2025, around 40% of all used tyres and rubber traded, and nearly half of the 3 million tonnes of waste tyres India recycled in 2023–24.[[gwt|HS 4012.20, 4004 and 4017, resolved: India 1.92 Mt of 5.10 Mt in 2025 (exporters' reports 1.74 of 4.56 Mt; India's own reports 2.09 of 5.19 Mt). 2025 is partly modelled.]][[niti|1.4 of the 3 million tonnes recycled in FY2024 were imported (p. 5).]] The United States and the UK are the largest suppliers, and 89% of the UK's waste rubber goes to India.[[gwt|2025, resolved: United States 0.51 Mt, UK 0.38 Mt.]][[ea|p. 9.]]"],
"t.pyro":[
"Much of it is thought to end up in pyrolysis plants, which heat tyres to recover oil, steel and carbon black. They take nearly three quarters of India's end-of-life tyres,[[cse|From field visits; not peer-reviewed.]] and imported tyres are likely to be a sizeable share of what they process.[[niti|p. 10.]] India's government warned in 2015 of fire hazards, fine carbon emissions and explosions when hot reactors are opened.[[sop2015]] In 2019, India's Central Pollution Control Board counted 637 plants, and 270 of them were breaking their permits.[[cpcb|Count of 31 July 2019, quoted in the Tribunal's order of 19 September 2019: 251 complying, 270 not complying, 116 closed.]] The National Green Tribunal found the process 'adversely affects the health of the workers', and in 2022 ordered non-compliant plants closed.[[cpcb|Tribunal order of 6 January 2020, quoted in the report.]][[ngt2022|Tribunal order of 7 November 2022, quoted in the filing.]] India has no specific emission standards for pyrolysis plants, and 20 to 25% operate outside regulatory oversight.[[niti|pp. 11 and 26.]] Robust research on their emissions and health effects in India is almost non-existent.[[khan]]",
"India banned imports of waste tyres for pyrolysis in July 2022.[[ea|pp. 13 and 16.]] In 2023, the year after, it still imported 1.1 million tonnes of tyres and rubber scrap, almost all declared as rubber waste (HS 4004) rather than used tyres (HS 4012.20).[[gwt|2023, resolved: 1.08 Mt in all; about 0.01 Mt under HS 4012.20.]] Shredded imports still feed the plants,[[niti|p. 10.]] and the UK's Environment Agency found UK tyres diverted to illegal pyrolysis on arrival, with falsified shipping forms. It now checks every tyre export to India.[[ea|pp. 10 to 12; enhanced checks from 1 October 2025.]]"],
"p.embedded":[
"Each stream's plastic share comes from a published source, or is marked as an assumption. The shares can be changed in the Explorer.[[shares]]"]
};

// citation rendering: numbers in order of first use on each page
const CITES={home:[],plastics:[],tyres:[],ewaste:["comtrade","balde2022","gem","lysaght"]};
function cited(page,txt){
  txt=txt.replace(/((?:\[\[[^\]]+\]\])+)([,;:])/g,"$2$1");
  return txt.replace(/((?:\[\[[^\]]+\]\])+)/g,run=>'<span class="cites">'+citeRun(page,run)+'</span>');
}
function citeRun(page,txt){
  return txt.replace(/\[\[(\w+)(?:\|([^\]]+))?\]\]/g,(m,k,note)=>{
    let n=CITES[page].indexOf(k); if(n<0){CITES[page].push(k);n=CITES[page].length-1}
    return `<a href="#${page}-ref-${k}" role="button" class="cite" data-page="${page}" data-ref="${k}"${note?` data-note="${note.replace(/"/g,"&quot;")}"`:""} aria-label="Source ${n+1}">${n+1}</a>`;
  }).replace(/<\/a><a /g,"</a>,<a ");
}
document.querySelectorAll("[data-text]").forEach(el=>{
  const page=el.dataset.text.startsWith("h.")?"home":el.dataset.text.startsWith("t.")?"tyres":"plastics";
  el.innerHTML=TEXT[el.dataset.text].map(p=>"<p>"+cited(page,p)+"</p>").join("");
});
function refList(page,host){
  document.querySelector(host+" ol").innerHTML=CITES[page].map(k=>`<li id="${page}-ref-${k}">${REFS[k].t}${REFS[k].u?` Available at: <a href="${REFS[k].u}" target="_blank" rel="noopener">${REFS[k].u}</a>`:""}</li>`).join("");
}
const pop=document.getElementById("pop");
document.addEventListener("click",e=>{
  const h=e.target.closest(".hs");
  if(h){pop.innerHTML=`<div>${h.dataset.tip}</div>`;pop.hidden=false;const rc=h.getBoundingClientRect(),w=pop.offsetWidth;pop.style.left=Math.max(12,Math.min(scrollX+rc.left-20,scrollX+document.documentElement.clientWidth-w-12))+"px";pop.style.top=(scrollY+rc.bottom+8)+"px";return}
  const b=e.target.closest(".cite");
  if(!b){ if(!e.target.closest("#pop")) pop.hidden=true; return; }
  e.preventDefault();
  const r=REFS[b.dataset.ref], n=CITES[b.dataset.page].indexOf(b.dataset.ref)+1;
  pop.innerHTML=`<div class="n">${n}</div><div>${r.t}</div>${b.dataset.note?`<div class="note">${b.dataset.note}</div>`:""}${r.u?`<a href="${r.u}" target="_blank" rel="noopener">Open the source</a>`:""}`;
  pop.hidden=false;
  const rc=b.getBoundingClientRect(), w=pop.offsetWidth;
  pop.style.left=Math.max(12,Math.min(scrollX+rc.left-20,scrollX+document.documentElement.clientWidth-w-12))+"px";
  pop.style.top=(scrollY+rc.bottom+8)+"px";
});
addEventListener("keydown",e=>{if(e.key==="Escape")pop.hidden=true;if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("hs")){e.preventDefault();e.target.click()}});
document.addEventListener("mouseover",e=>{const h=e.target.closest&&e.target.closest(".hs");if(h&&pop.hidden){h.click();pop.dataset.tip="1"}});
document.addEventListener("mouseout",e=>{const h=e.target.closest&&e.target.closest(".hs");if(h&&pop.dataset.tip){pop.hidden=true;delete pop.dataset.tip}});

// ---------------- state and routing ----------------
const plDark=true;
const DIM={get row(){return plDark?.76:.28},get seg(){return plDark?.6:.2}};
const cssEl=()=>plDark&&document.querySelector(`#p-${cur} .card,#p-${cur} .ty-card`)||document.documentElement;
const css=n=>getComputedStyle(cssEl()).getPropertyValue(n).trim();
const fmtMt=t=>(t/1e6).toFixed(t>=1e8?0:1);
const fmtBn=u=>(u/1e9).toFixed(u>=1e10?0:1);
const VIEW={"0":"exporters' reports","1":"importers' reports","2":"resolved figures"};
const S={hv:"2",hpk:"all",hps:"dest",pv:"2",pk:"all",hk:"in",pm:"t",ry:2023,ey:"2023"};
let D,W,G=null,drawn={};
let cur=document.body.dataset.page;
function show(){
  const p=cur;
  document.querySelectorAll("main.page").forEach(m=>m.classList.toggle("dk",plDark));
  pop.hidden=true;
  if(D){ p==="home"?drawHome():p==="tyres"?drawTyres():p==="ewaste"?drawEwaste():drawPlastics(); }
  if(p!=="plastics") stopPlay();
}
document.querySelectorAll(".seg[data-k]").forEach(seg=>seg.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return; const k=seg.dataset.k;
  S[k]=b.dataset.v;
  document.querySelectorAll(`.seg[data-k="${k}"] button`).forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===S[k]));
  drawn={}; show();
}));
let rz; addEventListener("resize",()=>{clearTimeout(rz);rz=setTimeout(()=>{drawn={};show()},150)});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{drawn={};show()});

// ---------------- chart helpers ----------------
function frame(sel,h,m){
  const svg=d3.select(sel); const w=svg.node().getBoundingClientRect().width||600;
  svg.attr("viewBox",`0 0 ${w} ${h}`).attr("height",h).selectAll("*").remove();
  return {svg,w,h,m,iw:w-m.l-m.r,ih:h-m.t-m.b,g:svg.append("g").attr("transform",`translate(${m.l},${m.t})`)};
}
function xAxis(f,x,every){
  const yrs=D.years.filter(y=>((y-2008)%every===0&&y<=2026-every)||y===2026);
  const ax=f.g.append("g").attr("class","ax").attr("transform",`translate(0,${f.ih})`)
    .call(d3.axisBottom(x).tickValues(yrs).tickFormat(y=>y).tickSizeOuter(0).tickPadding(7));
  ax.selectAll(".tick").filter(d=>d===2026).select("text").append("tspan").attr("x",0).attr("dy","1.25em").attr("font-size",12).text("(modelled)");
}
function yAxis(f,y,n,fmt,title){
  f.g.append("g").attr("class","ax").call(d3.axisLeft(y).ticks(n).tickFormat(fmt).tickSize(-f.iw).tickPadding(9)).call(g=>g.select(".domain").remove()).selectAll("line").attr("opacity",.45);
  if(title) f.g.append("text").attr("class","ytitle").attr("transform",`translate(${-f.m.l+13},${f.ih/2}) rotate(-90)`).attr("text-anchor","middle").text(title);
}
function hatch(f,id){f.svg.append("defs").html(`<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${css('--panel')}" stroke-width="2" opacity=".55"/></pattern>`);
  return id}
const mt=v=>v?String(+(v/1e6).toFixed(1)):"0";
// stacked area over years. keys:[[key,label,cssVar]], get(key,i)
function stackChart(sel,keys,get,o={}){
  const wide=innerWidth>760;
  const ev=o.events||[];
  const fs=wide?13.5:12, lh=Math.round(fs*1.25), mr=wide?40:30, ml=62;
  const iw0=(d3.select(sel).node().getBoundingClientRect().width||600)-ml-mr;
  const x0s=d3.scaleLinear().domain([2008,2026]).range([0,iw0]);
  const EL=ev.map(([yr,t])=>({yr,t,xx:x0s(yr)}));
  EL.forEach(e=>e.right=e.xx<iw0-60);
  EL.forEach((e,i)=>{const pv=EL[i-1],nx=EL[i+1];
    if(e.right){e.lo=e.xx+6;e.hi=nx?(nx.right?nx.xx-8:(e.xx+nx.xx)/2-4):iw0+mr-4}
    else{e.hi=e.xx-6;e.lo=pv?(pv.right?(pv.xx+e.xx)/2+4:pv.xx+8):-ml+4}
    const cx=document.createElement("canvas").getContext("2d");cx.font=`500 ${fs}px "IBM Plex Sans",sans-serif`;
    const W=Math.max(46,e.hi-e.lo), lines=[]; let cur="";
    e.t.split(" ").forEach(wd=>{const tr=cur?cur+" "+wd:wd;if(cx.measureText(tr).width>W&&cur){lines.push(cur);cur=wd}else cur=tr});
    if(cur)lines.push(cur); e.lines=lines;});
  const compact=EL.some(e=>e.hi-e.lo<64);
  const nl=compact?0:(d3.max(EL,e=>e.lines.length)||0);
  const f=frame(sel,(o.h||(wide?400:300))+(compact?EL.length*lh+8:0),{t:!ev.length?14:compact?26:10+(nl+1)*lh+4,r:mr,b:44+(compact?EL.length*lh+8:0),l:ml});
  const hid=hatch(f,sel.slice(1)+"h");
  const rows=D.years.map((y,i)=>Object.fromEntries([["y",y],...keys.map(k=>[k[0],get(k[0],i)])]));
  const st=d3.stack().keys(keys.map(k=>k[0]))(rows);
  const x=d3.scaleLinear().domain([2008,2026]).range([0,f.iw]);
  const max=o.pc?1:o.ymax||d3.max(st[st.length-1],d=>d[1])*1.08;
  const y=d3.scaleLinear().domain([0,max]).range([f.ih,0]); if(!o.ymax)y.nice(5);
  yAxis(f,y,wide?6:4,o.pc?d3.format(".0%"):mt,o.pc?"Share of exported tonnes":"Million tonnes");
  f.g.selectAll(".s").data(st).join("path").attr("d",d3.area().x(d=>x(d.data.y)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX)).attr("fill",(d,i)=>css(keys[i][2]));
  f.g.append("rect").attr("x",x(2025)).attr("y",0).attr("width",x(2026)-x(2025)).attr("height",f.ih).attr("fill",`url(#${hid})`);
  // event labels sit in a band above the plot: year on one line, the event below, each kept clear of the others
  if(compact) EL.forEach((e,k)=>{
    const xx=x(e.yr);
    f.g.append("line").attr("x1",xx).attr("x2",xx).attr("y1",-8).attr("y2",f.ih).attr("stroke",css("--ink")).attr("stroke-opacity",.55).attr("stroke-dasharray","2 3");
    f.g.append("circle").attr("cx",xx).attr("cy",-15).attr("r",8).attr("fill",css("--ink"));
    f.g.append("text").attr("x",xx).attr("y",-11).attr("text-anchor","middle").attr("font-size",12).attr("font-weight",700).style("fill",css("--panel")).text(k+1);
    const ky=f.ih+44+k*lh+6, kx=-f.m.l+4;
    f.g.append("circle").attr("cx",kx+7).attr("cy",ky-4).attr("r",7).attr("fill",css("--ink"));
    f.g.append("text").attr("x",kx+7).attr("y",ky).attr("text-anchor","middle").attr("font-size",11).attr("font-weight",700).style("fill",css("--panel")).text(k+1);
    const t=f.g.append("text").attr("x",kx+20).attr("y",ky).attr("font-size",fs).style("fill",css("--ink"));
    t.append("tspan").attr("font-weight",700).text(e.yr+" ");t.append("tspan").attr("font-weight",500).text(e.t);
  });
  else EL.forEach(e=>{
    const xx=x(e.yr);
    f.g.append("line").attr("x1",xx).attr("x2",xx).attr("y1",-f.m.t+4).attr("y2",f.ih).attr("stroke",css("--ink")).attr("stroke-opacity",.55).attr("stroke-dasharray","2 3");
    const tx=f.g.append("text").attr("font-size",fs).style("fill",css("--ink")).attr("y",-f.m.t+14).attr("text-anchor",e.right?"start":"end");
    const ax=e.right?xx+6:xx-6;
    tx.append("tspan").attr("x",ax).attr("font-weight",700).text(e.yr===2026?"2026":e.yr);
    e.lines.forEach(l=>tx.append("tspan").attr("x",ax).attr("dy",lh).attr("font-weight",500).text(l));
  });
  if(wide&&o.labels) o.labels.forEach(([key,yr,txt,light])=>{const i=D.years.indexOf(yr),ki=keys.findIndex(k=>k[0]===key),s=st[ki]&&st[ki][i];if(!s||y(s[0])-y(s[1])<18)return;
    f.g.append("text").attr("x",x(yr)).attr("y",(y(s[0])+y(s[1]))/2+5).attr("text-anchor","middle").attr("font-size",14).attr("font-weight",700).style("fill",light?"#fff":css("--ink")).text(txt)});
  xAxis(f,x,wide?2:6);
  return {f,x,y,st};
}
function lines(sel,series,o={}){
  const f=frame(sel,o.h||170,{t:10,r:18,b:26,l:58});
  const x=d3.scaleLinear().domain([2008,2026]).range([0,f.iw]);
  const max=d3.max(series.flatMap(s=>s.v));
  const y=d3.scaleLinear().domain([0,max*1.08]).nice(3).range([f.ih,0]);
  yAxis(f,y,3,mt,o.ytitle||"Million tonnes");
  series.forEach(s=>{
    const pts=s.v.map((v,i)=>[D.years[i],v]);
    if(s.fill) f.g.append("path").attr("d",d3.area().x(d=>x(d[0])).y0(f.ih).y1(d=>y(d[1])).curve(d3.curveMonotoneX)(pts)).attr("fill",s.c).attr("opacity",.18);
    f.g.append("path").attr("d",d3.line().x(d=>x(d[0])).y(d=>y(d[1])).curve(d3.curveMonotoneX)(pts.slice(0,-1))).attr("fill","none").attr("stroke",s.c).attr("stroke-width",2.2);
    f.g.append("path").attr("d",d3.line().x(d=>x(d[0])).y(d=>y(d[1])).curve(d3.curveMonotoneX)(pts.slice(-2))).attr("fill","none").attr("stroke",s.c).attr("stroke-width",2.2).attr("stroke-dasharray","3 3");
  });
  f.g.append("g").attr("class","ax").attr("transform",`translate(0,${f.ih})`).call(d3.axisBottom(x).tickValues(o.ticks||[2008,2013,2018,2023]).tickFormat(d3.format("d")).tickSizeOuter(0));
}
function hbars(sel,rows,keys,o={}){
  // rows:[{label, vals:{key:v}}]
  const rh=26, f=frame(sel,rows.length*rh+30,{t:4,r:54,b:24,l:o.l||150});
  const max=d3.max(rows,r=>d3.sum(keys,k=>r.vals[k[0]]||0));
  const x=d3.scaleLinear().domain([0,max]).nice(4).range([0,f.iw]);
  f.g.append("g").attr("class","ax").attr("transform",`translate(0,${rows.length*rh})`).call(d3.axisBottom(x).ticks(4).tickFormat(v=>v?mt(v)+" Mt":"0").tickSizeOuter(0));
  rows.forEach((r,i)=>{
    let x0=0; const g=f.g.append("g").attr("transform",`translate(0,${i*rh})`);
    g.append("text").attr("x",-8).attr("y",rh/2+4).attr("text-anchor","end").attr("font-size",14).style("fill",css("--ink")).text(r.label);
    keys.forEach(k=>{const v=r.vals[k[0]]||0; if(!v)return; g.append("rect").attr("x",x(x0)).attr("y",4).attr("height",rh-8).attr("width",Math.max(0,x(x0+v)-x(x0))).attr("fill",css(k[2])); x0+=v;});
    g.append("text").attr("x",x(x0)+6).attr("y",rh/2+4).attr("font-size",13).text(fmtMt(x0));
  });
}

// ---------------- keys ----------------
const DKEYS=[["China","China","--d1"],["Hong Kong","Hong Kong","--d2"],["SEA","Malaysia, Vietnam, Indonesia and Thailand","--d3"],["Turkey","Turkey","--d4"],["India","India","--d5"],["Pakistan","Pakistan","--d7"],["OtherM","Other middle- and low-income","--d8"],["EU","EU-27","--d9"],["OtherH","Other high-income","--d10"]];
const MKEYS=[["Plastic scrap","Plastic scrap","--m4"],["Textiles","Textiles (plastic fraction)","--m3"],["Rubber and tyres","Rubber & tyres","--m5"],["Refuse-derived fuel","Refuse-derived fuel (plastic fraction)","--m7"],["Paper and card","Paper & card (plastic contamination)","--m2"],["E-waste","E-waste (plastic fraction)","--m6"]];
const legend=(sel,keys)=>d3.selectAll(sel).html(keys.map(k=>{const m=k[1].match(/^(.*?) (\(.*\))$/);return `<li><i style="background:var(${k[2]})"></i><span>${m?`${m[1]}<small>${m[2]}</small>`:k[1]}</span></li>`}).join(""));
const EVENTS=[[2018,"China's import ban"],[2021,"Basel plastic rules"],[2026,"EU ban on exports to non-OECD"]];

// China and India paper chart: direct labels, one event marker, end values
function paperChart(){
  const K=c=>plDark?{"--d1":"#4fdde3","--d5":"#ff82c0"}[c]:css(c);
  const wide=innerWidth>640;
  const f=frame("#h-paper",wide?250:220,{t:30,r:wide?92:70,b:30,l:58});
  const x=d3.scaleLinear().domain([2008,2026]).range([0,f.iw]);
  const C=D.paper["1"].China, I=D.paper["1"].India;
  const y=d3.scaleLinear().domain([0,32e6]).range([f.ih,0]);
  yAxis(f,y,4,mt,"Million tonnes");
  const defs=f.svg.append("defs");
  const gr=defs.append("linearGradient").attr("id","pgrad").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",1);
  gr.append("stop").attr("offset",0).attr("stop-color",K("--d1")).attr("stop-opacity",plDark?.22:.28);
  gr.append("stop").attr("offset",1).attr("stop-color",K("--d1")).attr("stop-opacity",0);
  const pts=s=>s.map((v,i)=>[D.years[i],v]);
  const ln=d3.line().x(d=>x(d[0])).y(d=>y(d[1])).curve(d3.curveMonotoneX);
  f.g.append("path").attr("d",d3.area().x(d=>x(d[0])).y0(f.ih).y1(d=>y(d[1])).curve(d3.curveMonotoneX)(pts(C))).attr("fill","url(#pgrad)");
  // 2021 ban marker
  const xb=x(2021);
  f.g.append("line").attr("x1",xb).attr("x2",xb).attr("y1",-22).attr("y2",f.ih).attr("stroke",css("--ink")).attr("stroke-opacity",.5).attr("stroke-dasharray","2 3");
  const bt=f.g.append("text").attr("x",xb+6).attr("y",-12).attr("font-size",13).style("fill",css("--ink"));
  bt.append("tspan").attr("font-weight",700).text("2021 ");bt.append("tspan").text("China bans all solid waste imports");
  [[C,"--d1"],[I,"--d5"]].forEach(([s,c])=>{
    const p=pts(s);
    f.g.append("path").attr("d",ln(p.slice(0,-1))).attr("fill","none").attr("stroke",K(c)).attr("stroke-width",2.6).attr("stroke-linejoin","round");
    f.g.append("path").attr("d",ln(p.slice(-2))).attr("fill","none").attr("stroke",K(c)).attr("stroke-width",2.6).attr("stroke-dasharray","3 4");
  });
  // peak for China, end labels
  const i16=D.years.indexOf(2016);
  f.g.append("circle").attr("cx",x(2016)).attr("cy",y(C[i16])).attr("r",4).attr("fill",css("--panel")).attr("stroke",K("--d1")).attr("stroke-width",2);
  f.g.append("text").attr("x",x(2016)).attr("y",y(C[i16])-10).attr("text-anchor","middle").attr("font-size",13).attr("font-weight",600).style("fill",K("--d1")).text(fmtMt(C[i16])+" Mt in 2016");
  const iE=D.years.indexOf(2025);
  const ends=[["China",C[iE],"--d1"],["India",I[iE],"--d5"]];
  ends.forEach(([n,v,c],k)=>{
    const yy=y(v)+(k===0?6:-2);
    f.g.append("circle").attr("cx",x(2025)).attr("cy",y(v)).attr("r",3.5).attr("fill",K(c));
    const t=f.g.append("text").attr("x",f.iw+8).attr("y",Math.min(yy,f.ih-2)).attr("font-size",13.5).style("fill",K(c));
    t.append("tspan").attr("font-weight",700).text(n+" ");t.append("tspan").text(fmtMt(v));
  });
  f.g.append("g").attr("class","ax").attr("transform",`translate(0,${f.ih})`).call(d3.axisBottom(x).tickValues([2008,2012,2016,2020,2025]).tickFormat(d3.format("d")).tickSizeOuter(0).tickPadding(7));
}

// ================= HOME =================
function drawHome(){
  if(drawn.home) return; drawn.home=true;
  const i23=D.years.indexOf(2023), v=S.hv;
  const order=[["Metals","--m1"],["Paper and card","--m2"],["Textiles","--m3"],["Plastic","--m4"],["Rubber and tyres","--m5"],["E-waste","--m6"],["Batteries","--m7"]];
  const tot=w=>order.reduce((s,k)=>s+D.materials[w][k[0]].t[i23],0);
  const usd=w=>order.reduce((s,k)=>s+D.materials[w][k[0]].usd[i23],0);
  document.getElementById("h-big").innerHTML=
    `<div class="exp"><b class="num">${fmtMt(tot("0"))}<small>Mt</small></b><span>Exporters' reports &middot; US$${fmtBn(usd("0"))}bn</span></div>`+
    `<div class="imp"><b class="num">${fmtMt(tot("1"))}<small>Mt</small></b><span>Importers' reports &middot; US$${fmtBn(usd("1"))}bn</span></div>`+
    `<div class="res" title="Resolved: the mean of the two reports where both countries report, otherwise whichever reported. The method is still being agreed."><b class="num">${fmtMt(tot("2"))}<small>Mt</small></b><span>Resolved &middot; US$${fmtBn(usd("2"))}bn</span></div>`;
  document.getElementById("h-ribview").textContent=VIEW[v];
  const M=D.materials[v], T=tot(v);
  const nm=k=>k==="Plastic"?"Plastic scrap":k;
  document.getElementById("h-bar").innerHTML=order.map(k=>{const p=M[k[0]].t[i23]/T*100;return `<div style="flex:${p} 1 0;background:var(${k[1]})" title="${nm(k[0])}">${p>12?nm(k[0]):""}</div>`}).join("");
  document.getElementById("h-mats").innerHTML=order.map(k=>`<li style="border-color:var(${k[1]})"><span>${nm(k[0])}</span><b class="num">${fmtMt(M[k[0]].t[i23])} Mt</b><small>US$${fmtBn(M[k[0]].usd[i23])}bn</small></li>`).join("");
  paperChart();
  // plastics chart
  const all=S.hpk==="all";
  if(S.hps==="dest"){
    const src=all?D.destAll[v]:D.dest[v];
    document.getElementById("h-pl-title").textContent=(all?"Plastic traded, including embedded plastic,":"Plastic scrap traded,")+" by destination";
    legend("#h-pl-leg",DKEYS);
    stackChart("#h-pl",DKEYS,(k,i)=>src[k][i],{ymax:25e6,events:EVENTS,labels:[["China",2012,"China",true],["Hong Kong",2010,"Hong Kong",true],["EU",2016,"EU-27",true],["OtherM",2022,"Other middle- and low-income",true]]});
  } else {
    const keys=all?MKEYS:MKEYS.slice(0,1);
    document.getElementById("h-pl-title").textContent=(all?"Plastic traded, including embedded plastic,":"Plastic scrap traded,")+" by material";
    legend("#h-pl-leg",keys);
    stackChart("#h-pl",keys,(k,i)=>D.streams[v][k][i],{ymax:25e6,events:EVENTS,labels:[["Plastic scrap",2012,"Plastic scrap",true],["Textiles",2022,"Textiles",true],["Rubber and tyres",2023,"Rubber and tyres",true]]});
  }
  refList("home","#h-refs");
}

// ================= PLASTICS =================
const sumG=(obj,i)=>Object.values(obj).reduce((s,a)=>s+a[i],0);
function drawTyres(){
  if(drawn.tyres) return; drawn.tyres=true;
  const v=S.pv;
  buildTyMap(); window.tyTicks&&tyTicks();
  tyShare(D.tyresIndia[v]); tySuppliers(v);
  refList("tyres","#t-refs");
}
function drawPlastics(){
  const v=S.pv, i23=D.years.indexOf(2023);
  if(!drawn.plastics){
  drawn.plastics=true;
  // tiles
  const sc=D.streams[v]["Plastic scrap"][i23], al=sumG(D.streams[v],i23);
  document.getElementById("p-tiles").innerHTML=`<div><b class="num">${fmtMt(sc)} Mt</b><span>Plastic scrap (<span class="hs" tabindex="0" role="button" data-tip="Harmonized System (HS) code 3915: waste, parings and scrap of plastics. The Harmonized System is the international list of codes that customs authorities use to classify traded goods.">HS 3915</span>)</span></div><div class="all"><b class="num">${fmtMt(al)} Mt</b><span>Including embedded plastic</span></div>`;
  legend("#p-mat-leg",MKEYS); legend(".p-matleg",MKEYS);
  stackChart("#p-mat",MKEYS,(k,i)=>D.streams[v][k][i],{ymax:25e6,events:EVENTS,labels:[["Plastic scrap",2012,"Plastic scrap",true],["Textiles",2022,"Textiles",true],["Rubber and tyres",2023,"Rubber and tyres",true]]});
  legend("#p-dest-leg",DKEYS.filter(k=>(S.pk==="all"?D.destAll[v]:D.dest[v])[k[0]]));
  document.getElementById("p-dest-title").textContent=S.pk==="all"?"Plastic traded, including embedded plastic, by destination":"Plastic scrap (HS 3915) traded, by destination";
  const DS=S.pk==="all"?D.destAll[v]:D.dest[v];
  stackChart("#p-dest",DKEYS.filter(k=>DS[k[0]]),(k,i)=>DS[k][i],{ymax:25e6,events:EVENTS.slice(0,1),labels:[["China",2012,"China",true],["Hong Kong",2010,"Hong Kong",true],["EU",2016,"EU-27",true],["OtherM",2022,"Other middle- and low-income",true]]});
  // HIC by income group
  buildSankey();
  // receivers
  buildRace();
  const C=D.csel[v];
  // country cards
  const host=document.getElementById("p-cards"); host.innerHTML="";
  // every country that has been among the largest receivers: the 12 with the highest yearly total in any year
  const tt=(g,i)=>sumG(g,i), mlicY=(c,i)=>"UML".includes((D.countries[c].inc||"N".repeat(19))[i]);
  const pk=Object.keys(C).filter(c=>D.countries[c]).map(c=>{let b=0,by=2008;D.years.forEach((y,i)=>{if(y<2026&&mlicY(c,i)&&tt(C[c],i)>b){b=tt(C[c],i);by=y}});return {c,n:D.countries[c].n,b,by}})
    .sort((a,b)=>b.b-a.b).slice(0,12);
  pk.forEach(({c,n,b,by},k)=>{
    const g=C[c];
    const el=document.createElement("div"); el.className="p-card";
    el.innerHTML=`<h3>${n}<small>Peak ${fmtMt(b)} Mt in ${by}</small></h3><svg class="chart" id="pc${k}" role="img" aria-label="${n}: plastic received by material, 2008 to 2026"></svg>`;
    host.appendChild(el);
    const f=frame("#pc"+k,170,{t:14,r:22,b:26,l:56});
    const st=d3.stack().keys(MKEYS.map(m=>m[0]))(D.years.map((y,i)=>Object.fromEntries([["y",y],...MKEYS.map(m=>[m[0],g[m[0]]?g[m[0]][i]:0])])));
    const x=d3.scaleLinear().domain([2008,2026]).range([0,f.iw]);
    const y=d3.scaleLinear().domain([0,d3.max(st[st.length-1],d=>d[1])*1.08]).nice(3).range([f.ih,0]);
    yAxis(f,y,3,v=>v?String(+(v/1e6).toFixed(2)):"0","Million tonnes");
    f.g.selectAll(".s").data(st).join("path").attr("d",d3.area().x(d=>x(d.data.y)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX)).attr("fill",(d,i)=>css(MKEYS[i][2]));
    f.g.append("g").attr("class","ax").attr("transform",`translate(0,${f.ih})`).call(d3.axisBottom(x).tickValues(d3.range(2008,2027,innerWidth<400?6:3)).tickFormat(d3.format("d")).tickSizeOuter(0));
  });
  // embedded table
  const SH=[["Plastic scrap","HS 3915","100%",["Plastic scrap",1],"By definition"],
    ["Used clothing","HS 6309","65%",null,"Textile Exchange (2023), synthetic share of fibre","tex"],
    ["Rags, twine and rope","HS 6310","65%",null,"Assumption, using Textile Exchange (2023)","tex"],
    ["Synthetic fibres","HS 5505.10","100%",null,"Assumption: synthetic fibre is plastic",""],
    ["Used tyres","HS 4012.20","100%",null,"Assumption: the whole tyre counts as plastic",""],
    ["Rubber waste and scrap","HS 4004","100%",null,"Assumption: all rubber counts as plastic",""],
    ["Hard rubber","HS 4017","100%",null,"Assumption: all rubber counts as plastic",""],
    ["Refuse-derived fuel","HS 3825.10","33.25%",["Refuse-derived fuel",1],"Gerassimidou et al. (2020), Table 1","ger"],
    ["Electronic and electrical waste","HS 8549.31, .39, .91, .99","24.7%",["E-waste",1],"OECD (2022) and Baldé et al. (2024)","oecd"],
    ["Paper and card bales","HS 4707","2%",["Paper and card",1],"Assumption, for illustration",""]];
  if(document.getElementById("p-tbl"))document.getElementById("p-tbl").innerHTML=SH.map(r=>{
    const val=r[3]?fmtMt(D.streams[v][r[3][0]][i23]).replace(/^0\.0$/,"<0.1")+" Mt":"";
    return `<tr><td>${r[0]}</td><td><small>${r[1]}</small></td><td class="n">${r[2]}</td><td class="n">${val}</td><td>${r[4]}${r[5]?cited("plastics",`[[${r[5]}]]`):""}</td></tr>`}).join("")+
    `<tr><td>Textiles together</td><td></td><td></td><td class="n">${fmtMt(D.streams[v]["Textiles"][i23])} Mt</td><td></td></tr><tr><td>Rubber and tyres together</td><td></td><td></td><td class="n">${fmtMt(D.streams[v]["Rubber and tyres"][i23])} Mt</td><td></td></tr>`;
  refList("plastics","#p-refs");
  }
}

// ---------------- map ----------------
let bYear=2008,bTimer=null,bBuilt=false,bProj,bCent={},bW,bH;
const OVR={"842":[-96,39],"251":[2.4,46.6],"579":[9.5,61],"643":[44,56],"124":[-82,47],"156":[114,31],"458":[102,3.6],"360":[107,-6.5],"76":[-46,-23],"36":[147,-33],"392":[138,36],"484":[-100,21],"704":[106.5,15],"826":[-1.5,52.5],"616":[19,52],"300":[22.5,39.5]};
function buildMap(){
  const box=document.getElementById("b-map"); box.innerHTML="";
  const r=box.getBoundingClientRect(); bW=r.width; bH=r.height;
  const land=topojson.feature(W,W.objects.countries); land.features=land.features.filter(f=>f.id!=="010");
  bProj=d3.geoNaturalEarth1().fitExtent([[4,4],[bW-4,bH-4]],{type:"FeatureCollection",features:land.features.filter(f=>f.id!=="304")});
  const path=d3.geoPath(bProj), byId={}; land.features.forEach(f=>byId[f.id]=f);
  bCent={};
  for(const [c,o] of Object.entries(D.countries)){const ll=OVR[c]||(o.m&&byId[o.m]?d3.geoCentroid(byId[o.m]):o.ll); if(ll) bCent[c]=bProj(ll);}
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${bW} ${bH}`).attr("role","img").attr("aria-label","Animated map of the largest plastic trade routes each year");
  svg.append("g").selectAll("path").data(land.features).join("path").attr("class","land").attr("d",path);
  svg.append("defs").attr("id","bdefs"); svg.append("g").attr("id","b-routes"); svg.append("g").attr("id","b-flows"); svg.append("g").attr("id","b-labs");
  bBuilt=true;
}
function arc(a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),k=.22;return `M${a[0]},${a[1]}Q${(a[0]+b[0])/2-dy*k},${(a[1]+b[1])/2+dx*k-d*.06} ${b[0]},${b[1]}`}
function drawMap(){
  if(!drawn.map){buildMap();drawn.map=true}
  setYear(bYear,true);
  const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!bTimer&&!rm&&!document.getElementById("b-play").dataset.paused) startPlay(); else if(!bTimer) document.getElementById("b-play").textContent="Play";
}
function setYear(y,instant){
  bYear=y; const v=S.pv, i=D.years.indexOf(y);
  document.getElementById("b-year").textContent=y;
  document.getElementById("b-yrnote").textContent=(y===2026?"Modelled · ":"")+(S.pk==="all"?"Including embedded · ":"Plastic scrap · ")+VIEW[v].replace(/^./,c=>c.toUpperCase());
  document.getElementById("b-range").value=y;
  const R=(S.pk==="all"?D.routesAll:D.routes)[v][i].filter(r=>bCent[r[0]]&&bCent[r[1]]).slice(0,180);
  const wS=d3.scaleSqrt().domain([0,2.5e6]).range([0,Math.max(10,bW/90)]), key=r=>r[0]+"-"+r[1];
  d3.select("#bdefs").selectAll("linearGradient").data(R,key).join(en=>{const g=en.append("linearGradient").attr("gradientUnits","userSpaceOnUse");g.append("stop").attr("offset",0).attr("stop-color","#ff7a3d");g.append("stop").attr("offset",1).attr("stop-color","#3cc3c4");return g})
    .attr("id",r=>"g"+key(r)).attr("x1",r=>bCent[r[0]][0]).attr("y1",r=>bCent[r[0]][1]).attr("x2",r=>bCent[r[1]][0]).attr("y2",r=>bCent[r[1]][1]);
  const t=d3.transition().duration(instant?0:650);
  d3.select("#b-routes").selectAll("path").data(R,key).join(en=>en.append("path").attr("class","route").attr("stroke-width",0),up=>up,ex=>ex.transition(t).attr("stroke-width",0).remove())
    .attr("d",r=>arc(bCent[r[0]],bCent[r[1]])).attr("stroke",r=>`url(#g${key(r)})`).sort((a,b)=>a[2]-b[2])
    .transition(t).attr("stroke-width",r=>Math.max(.6,wS(r[2])));
  d3.select("#b-flows").selectAll("path").data(R.slice(0,40),key).join("path").attr("class","flow").attr("d",r=>arc(bCent[r[0]],bCent[r[1]])).attr("stroke-width",r=>Math.max(1,wS(r[2])*.35));
  const inn={}; R.forEach(r=>inn[r[1]]=(inn[r[1]]||0)+r[2]);
  const top=[]; Object.entries(inn).sort((a,b)=>b[1]-a[1]).forEach(d=>{if(top.length>=(bW>700?6:3))return;const p=bCent[d[0]];if(top.every(q=>Math.abs(bCent[q[0]][0]-p[0])>90||Math.abs(bCent[q[0]][1]-p[1])>18))top.push(d)});
  d3.select("#b-labs").selectAll("text").data(top,d=>d[0]).join("text").attr("class","lab").attr("x",d=>bCent[d[0]][0]+6).attr("y",d=>bCent[d[0]][1]-6).html(d=>`${D.countries[d[0]].n} <tspan>${fmtMt(d[1])} Mt</tspan>`);
}
function startPlay(){stopPlay();const b=document.getElementById("b-play");b.textContent="Pause";delete b.dataset.paused;bTimer=setInterval(()=>setYear(bYear>=2026?2008:bYear+1),1500)}
// ---------------- tyres into India: dark animated map ----------------
let tyYear=2008,tyTimer=null,TY=null;
function buildTyMap(){
  const box=document.getElementById("ty-box"); box.innerHTML="";
  box.style.height=""; box.style.aspectRatio="";
  let r=box.getBoundingClientRect(), w=r.width, h=r.height; const narrow=w<600;
  const land=topojson.feature(W,W.objects.countries); land.features=land.features.filter(f=>f.id!=="010");
  // crop to the land: Alaska on the left edge, just inside New Zealand on the right, no empty Pacific
  const proj=d3.geoNaturalEarth1().rotate([-10,0]);
  if(narrow) proj.rotate([-20,0]).fitExtent([[4,4],[w-4,h-4]],{type:"MultiPoint",coordinates:[[-100,55],[155,-42],[-100,-42],[155,55]]});
  else{const bx={type:"MultiPoint",coordinates:[[-166,58],[-166,68],[176,-37],[176,-46],[10,76],[-40,76],[-68,-56]]}; proj.fitWidth(w,bx); const bb=d3.geoPath(proj).bounds(bx); h=Math.round(bb[1][1]-bb[0][1]); proj.translate([proj.translate()[0],proj.translate()[1]-bb[0][1]]); box.style.aspectRatio="auto"; box.style.height=h+"px"}
  const path=d3.geoPath(proj), byId={}; land.features.forEach(f=>byId[f.id]=f);
  const cen={}; for(const [c,o] of Object.entries(D.countries)){const ll=OVR[c]||(o.m&&byId[o.m]?d3.geoCentroid(byId[o.m]):o.ll); if(ll) cen[c]=proj(ll);}
  cen["699"]=proj([79,22]);
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${w} ${h}`).attr("role","img").attr("aria-label","Animated map of used tyres and rubber shipped to India each year");
  const df=svg.append("defs");
  df.append("filter").attr("id","tyglow").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%").html('<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>');
  svg.append("g").selectAll("path").data(land.features).join("path").attr("class",f=>"land"+(f.id==="356"?" in":"")).attr("d",path);
  ["oth","rt","fl","pl","ld","lab"].forEach(k=>svg.append("g").attr("class","g-"+k));
  svg.select(".g-rt").attr("filter","url(#tyglow)");
  const [ix,iy]=cen["699"];
  svg.select(".g-pl").append("circle").attr("class","pulse").attr("cx",ix).attr("cy",iy).attr("r",narrow?14:22);
  TY={svg,cen,w,h,narrow,df,proj};
  setTyYear(tyYear,true);
}
function setTyArc(a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),k=.2;return `M${a[0]},${a[1]}Q${(a[0]+b[0])/2-dy*k},${(a[1]+b[1])/2+dx*k-d*.08} ${b[0]},${b[1]}`}
function setTyYear(y,instant){
  tyYear=y; document.getElementById("ty-range").value=y; const yl=Math.floor(y+1e-6); document.getElementById("ty-yr").textContent=yl>=2026?"2026*":yl;
  if(!TY) return;
  // glide between years: each route's tonnage is interpolated, so lines swell and fade smoothly
  const {svg,cen,w,h,narrow,df,proj}=TY, v=S.pv, n=D.years.length, i0=Math.max(0,Math.min(n-1,Math.floor(y-2008+1e-6))), i1=Math.min(n-1,i0+1), fr=Math.max(0,Math.min(1,y-2008-i0));
  const M={}; [[i0,1-fr],[i1,fr]].forEach(([ii,wt])=>D.tyreRoutes[v][ii].forEach(r=>{if(!cen[r[0]]||!cen[r[1]])return;const k=r[0]+"-"+r[1];(M[k]=M[k]||[r[0],r[1],0])[2]+=r[2]*wt}));
  const Rt=Object.values(M).filter(r=>r[2]>=300).sort((a,b)=>b[2]-a[2]);
  const ind=Rt.filter(r=>r[1]==="699"), oth=Rt.filter(r=>r[1]!=="699").slice(0,narrow?30:60), key=r=>r[0]+"-"+r[1];
  const T=D.tyresIndia[v], li=a=>a[i0]*(1-fr)+a[i1]*fr, tot=d3.sum(ind,r=>r[2]);
  const ti=li(T.india); document.getElementById("ty-t").innerHTML=ti<1e5?`${Math.round(ti/1e3)}<small>thousand tonnes per year</small>`:`${(ti/1e6).toFixed(2)}<small>million tonnes per year</small>`;
  document.getElementById("ty-s").textContent=`${Math.round(li(T.india)/li(T.world)*100)}% of world trade in used tyres and rubber${yl>=2026?" · modelled":""}`;
  const wS=d3.scaleSqrt().domain([0,5e5]).range([0,narrow?7:Math.max(8,w/95)]);
  svg.select(".g-oth").selectAll("path").data(oth,key).join(en=>en.append("path").attr("class","oth").attr("stroke-width",0),up=>up,ex=>ex.remove())
    .attr("d",r=>setTyArc(cen[r[0]],cen[r[1]])).attr("stroke-width",r=>Math.max(.4,wS(r[2])*.6));
  df.selectAll("linearGradient").data(ind,key).join(en=>{const g=en.append("linearGradient").attr("gradientUnits","userSpaceOnUse");g.append("stop").attr("offset",0).attr("stop-color","#ffd166");g.append("stop").attr("offset",1).attr("stop-color","#ff4d2e");return g})
    .attr("id",r=>"tg"+key(r)).attr("x1",r=>cen[r[0]][0]).attr("y1",r=>cen[r[0]][1]).attr("x2",r=>cen[r[1]][0]).attr("y2",r=>cen[r[1]][1]);
  svg.select(".g-rt").selectAll("path").data(ind,key).join(en=>en.append("path").attr("class","rt").attr("stroke-width",0),up=>up,ex=>ex.remove())
    .attr("d",r=>setTyArc(cen[r[0]],cen[r[1]])).attr("stroke",r=>`url(#tg${key(r)})`).sort((a,b)=>a[2]-b[2])
    .attr("stroke-width",r=>Math.max(.7,wS(r[2])));
  svg.select(".g-fl").selectAll("path").data(ind.slice(0,30),key).join("path").attr("class","fl").attr("d",r=>setTyArc(cen[r[0]],cen[r[1]])).attr("stroke-width",r=>Math.max(1,wS(r[2])*.4));
  svg.select(".pulse").attr("r",(narrow?10:16)+wS(tot)*1.4);
  // name the suppliers: European ones in a column out in the Atlantic with leader lines, the rest beside their country, never overlapping
  const fv=t=>t>=1e5?fmtMt(t)+" Mt":Math.round(t/1e3)+" kt", tw=r=>(D.countries[r[0]].n.length+fv(r[2]).length+1)*7.2;
  const [ex0,ey0]=proj([-12,71]), [ex1,ey1]=proj([32,35]), eu=p=>p[0]>ex0&&p[0]<ex1&&p[1]>ey0&&p[1]<ey1;
  const cand=ind.filter(r=>r[2]>=(narrow?3e4:6e3)).slice(0,narrow?5:22), boxes=[], labs=[], col=[];
  const [ix,iy]=cen["699"]; boxes.push([ix+6,iy+8,ix+70,iy+30]);
  const hit=b=>b[0]<4||b[2]>w-4||b[1]<4||b[3]>h-4||boxes.some(q=>b[0]<q[2]&&b[2]>q[0]&&b[1]<q[3]&&b[3]>q[1]);
  cand.forEach(r=>{const p=cen[r[0]];
    if(!narrow&&eu(p)){col.push(r);return}
    const W2=tw(r);
    // labels sit on the far side from India, so they never cross their own flow: west of India to the left, east of India to the right or below
    const opts=p[0]<ix?[[-8,4,"end"],[-8,-7,"end"],[-8,16,"end"],[0,-10,"middle"]]:[[8,4,"start"],[0,18,"middle"],[8,16,"start"],[8,-7,"start"]];
    for(const [dx,dy,an] of opts){
      const x0=an==="start"?p[0]+dx:an==="end"?p[0]+dx-W2:p[0]+dx-W2/2, b=[x0,p[1]+dy-11,x0+W2,p[1]+dy+3];
      if(!hit(b)){boxes.push(b);labs.push({r,x:p[0]+dx,y:p[1]+dy,an});return}
    }});
  if(col.length){
    const cx=proj([-14,50])[0], gap=15, ys=col.map(r=>cen[r[0]][1]), mid=d3.mean(ys);
    col.sort((a,b)=>cen[a[0]][1]-cen[b[0]][1]);
    let y0=Math.max(18,Math.min(h-col.length*gap-10,mid-col.length*gap/2));
    col.forEach((r,k)=>labs.push({r,x:cx,y:y0+k*gap,an:"end",ld:true}));
  }
  svg.select(".g-lab").selectAll("text.lab:not(.in)").data(labs,d=>d.r[0]).join("text").attr("class","lab").attr("text-anchor",d=>d.an).attr("x",d=>d.x).attr("y",d=>d.y)
    .html(d=>`${D.countries[d.r[0]].n} <tspan>${fv(d.r[2])}</tspan>`);
  svg.select(".g-ld").selectAll("path").data(labs.filter(d=>d.ld),d=>d.r[0]).join("path").attr("fill","none").attr("stroke","#ffb37a").attr("stroke-width",.8).attr("opacity",.7)
    .attr("d",d=>{const p=cen[d.r[0]];return `M${d.x+4},${d.y-4}L${d.x+14},${d.y-4}L${p[0]-2},${p[1]}`});
  svg.select(".g-lab").selectAll("text.in").data([0]).join("text").attr("class","lab in").attr("x",ix+10).attr("y",iy+24).text("India");
}
const TY_MS=1700; // per year
function tyStop(){if(tyTimer)cancelAnimationFrame(tyTimer);tyTimer=null;document.getElementById("ty-play").textContent="Play"}
function tyPlay(){tyStop();if(tyYear>=2026)tyYear=2008;document.getElementById("ty-play").textContent="Pause";let last=performance.now();
  const step=now=>{const dt=Math.min(100,now-last);last=now;const y=Math.min(2026,tyYear+dt/TY_MS);setTyYear(y);if(y>=2026){tyStop();return}tyTimer=requestAnimationFrame(step)};
  tyTimer=requestAnimationFrame(step)}
document.getElementById("ty-play")?.addEventListener("click",()=>tyTimer?tyStop():tyPlay());
document.getElementById("ty-range")?.addEventListener("input",e=>{tyStop();setTyYear(+e.target.value)});
(function(){const tk=document.getElementById("ty-ticks"); if(!tk)return; const pc=y=>(y-2008)/18*100;
  const draw=window.tyTicks=()=>{const w=tk.getBoundingClientRect().width||600, every=w>900?1:w>440?2:6;
    tk.innerHTML=d3.range(2008,2027).map(y=>`<span class="${(y-2008)%every===0||y===2026?"":"n"}" style="left:${pc(y)}%">${y}</span>`).join("")};
  draw(); new ResizeObserver(draw).observe(tk);})();
new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting&&!tyTimer&&TY&&!matchMedia("(prefers-reduced-motion: reduce)").matches){tyYear=2008;tyPlay();o.disconnect()}})},{threshold:.45}).observe(document.getElementById("ty-box")||document.createElement("i"));
// India against the rest of the world: stacked area, India glowing at the bottom, share called out
function tyShare(T){
  const f=frame("#t-share",260,{t:26,r:96,b:28,l:44}), Y=D.years, n=Y.length, last=Y.indexOf(2025);
  const x=d3.scaleLinear().domain([2008,2026]).range([0,f.iw]), y=d3.scaleLinear().domain([0,d3.max(T.world)*1.08]).nice(4).range([f.ih,0]);
  const df=f.svg.append("defs"), gi=df.append("linearGradient").attr("id","tyA").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",1);
  gi.append("stop").attr("offset",0).attr("stop-color","#ff7a3d").attr("stop-opacity",.95);gi.append("stop").attr("offset",1).attr("stop-color","#ff4d2e").attr("stop-opacity",.35);
  f.g.append("g").selectAll("line").data(y.ticks(4)).join("line").attr("x1",0).attr("x2",f.iw).attr("y1",y).attr("y2",y).attr("stroke","var(--hero-line)");
  f.g.append("g").selectAll("text").data(y.ticks(4)).join("text").attr("x",-8).attr("y",d=>y(d)+4).attr("text-anchor","end").style("fill","var(--hero-muted)").attr("font-size",12).style("font-family","var(--mono)").text(d=>d?+(d/1e6).toFixed(1):"0");
  f.g.append("text").attr("x",-f.m.l).attr("y",-12).attr("text-anchor","start").style("fill","var(--hero-muted)").attr("font-size",12).text("Million tonnes");
  const ar=(lo,hi)=>d3.area().x((d,i)=>x(Y[i])).y0((d,i)=>y(lo(i))).y1((d,i)=>y(hi(i))).curve(d3.curveMonotoneX)(T.world);
  f.g.append("path").attr("d",ar(()=>0,i=>T.world[i])).style("fill","var(--hero-land)");
  f.g.append("path").attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y(d)).curve(d3.curveMonotoneX)(T.world)).style("fill","none").attr("stroke","var(--hero-muted)").attr("stroke-width",1.2);
  f.g.append("path").attr("d",ar(()=>0,i=>T.india[i])).style("fill","url(#tyA)").attr("filter","url(#tyglow2)");
  df.append("filter").attr("id","tyglow2").attr("x","-20%").attr("y","-20%").attr("width","140%").attr("height","140%").html('<feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>');
  f.g.append("path").attr("d",d3.line().x((d,i)=>x(Y[i])).y(d=>y(d)).curve(d3.curveMonotoneX)(T.india)).style("fill","none").attr("stroke","#ffd166").attr("stroke-width",2);
  // the 2022 ban on importing waste tyres for pyrolysis
  const bx=x(2022.5); f.g.append("line").attr("x1",bx).attr("x2",bx).attr("y1",-4).attr("y2",f.ih).attr("stroke","var(--hero-ink)").attr("stroke-dasharray","2 3").attr("opacity",.6);
  f.g.append("text").attr("x",bx-6).attr("y",innerWidth<500?20:4).attr("text-anchor","end").style("fill","var(--hero-ink)").attr("font-size",12).attr("font-weight",600).style("paint-order","stroke").style("stroke","var(--hero)").style("stroke-width","6px").style("stroke-linejoin","round").text(innerWidth<500?"2022 ban":"July 2022: pyrolysis import ban");
  // shares at a few points
  [2008,2016,2025].forEach(yy=>{const i=Y.indexOf(yy),px=x(yy),py=y(T.india[i]);
    f.g.append("circle").attr("cx",px).attr("cy",py).attr("r",4).style("fill","#ffd166").attr("stroke","var(--hero)").attr("stroke-width",1.5);
    f.g.append("text").attr("x",px+(yy===2008?6:0)).attr("y",py-10).attr("text-anchor",yy===2008?"start":"middle").style("fill","#ffd166").attr("font-size",13).attr("font-weight",700).text(Math.round(T.india[i]/T.world[i]*100)+"%")});
  // end labels
  const ex=f.iw+8;
  f.g.append("text").attr("x",ex).attr("y",y(T.world[last])+4).style("fill","var(--hero-ink)").attr("font-size",13).attr("font-weight",600).html(`World <tspan fill="var(--hero-muted)" font-weight="500">${fmtMt(T.world[last])} Mt</tspan>`);
  f.g.append("text").attr("x",ex).attr("y",y(T.india[last])+4).style("fill","#ff9a5c").attr("font-size",13).attr("font-weight",700).html(`India <tspan font-weight="500">${fmtMt(T.india[last])} Mt</tspan>`);
  f.g.append("g").attr("transform",`translate(0,${f.ih})`).call(d3.axisBottom(x).tickValues(d3.range(2008,2027,innerWidth<500?6:3)).tickFormat(d3.format("d")).tickSizeOuter(0)).call(g=>{g.selectAll("text").style("fill","var(--hero-muted)").style("font-family","var(--mono)");g.selectAll("line,path").attr("stroke","var(--hero-line)")});
}
// India's suppliers in 2025: ranked glowing bars that grow in when scrolled into view
function tySuppliers(v){
  const i=D.years.indexOf(2025), R=D.tyreRoutes[v][i].filter(r=>r[1]==="699"&&D.countries[r[0]]).sort((a,b)=>b[2]-a[2]), tot=d3.sum(R,r=>r[2]), top=R.slice(0,10);
  const narrow=innerWidth<560, rh=24, f=frame("#t-from",top.length*rh+8,{t:4,r:narrow?88:110,b:4,l:narrow?108:120});
  const x=d3.scaleLinear().domain([0,top[0][2]]).range([0,f.iw]), df=f.svg.append("defs"), g=df.append("linearGradient").attr("id","tyB");
  g.append("stop").attr("offset",0).attr("stop-color","#ff4d2e");g.append("stop").attr("offset",1).attr("stop-color","#ffd166");
  const rows=f.g.selectAll("g").data(top).join("g").attr("transform",(r,k)=>`translate(0,${k*rh})`);
  rows.append("text").attr("x",-10).attr("y",rh/2+4).attr("text-anchor","end").style("fill","var(--hero-ink)").attr("font-size",14).attr("font-weight",600).text(r=>D.countries[r[0]].n);
  rows.append("rect").attr("y",4).attr("height",rh-8).attr("rx",3).style("fill","url(#tyB)").attr("width",0).attr("class","tyb");
  rows.append("text").attr("class","tyv").attr("y",rh/2+4).attr("x",6).style("fill","var(--hero-ink)").attr("font-size",13).style("font-family","var(--mono)").attr("opacity",0)
    .html(r=>`${r[2]>=1e5?fmtMt(r[2])+" Mt":Math.round(r[2]/1e3)+" kt"} <tspan fill="#ffb37a">${Math.round(r[2]/tot*100)}%</tspan>`);
  const grow=()=>{rows.select(".tyb").transition().duration(1100).delay((r,k)=>k*90).ease(d3.easeCubicOut).attr("width",r=>x(r[2]));
    rows.select(".tyv").transition().duration(1100).delay((r,k)=>k*90).ease(d3.easeCubicOut).attr("x",r=>x(r[2])+6).attr("opacity",1)};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) grow();
  else new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting){grow();o.disconnect()}})},{threshold:.4}).observe(f.svg.node());
}
// ---------------- animated sankey: HIC exports, material -> recipient income group ----------------
// ---------------- receivers race ----------------
let rcYear=2008, rcRAF=null, rcLast=0, RC=null, rcHold=0, rcBeat=0, rcCom=true, rcCap=null;
const RC_N=15, RC_MS=2400, RC_HOLD=4200;
function buildRace(){
  const C=D.csel[S.pv], narrow=innerWidth<600, N=RC_N, rh=narrow?24:27;
  const f=frame("#p-recv",N*rh+30+rh+18,{t:30,r:narrow?52:64,b:rh+18,l:narrow?104:170});
  const cs=Object.keys(C).filter(c=>D.countries[c]);
  ["world","grid","bars","other","ann","yr"].forEach(c=>f.g.append("g").attr("class",c));
  f.g.select(".yr").append("text").attr("class","rc-yr").attr("text-anchor","end").attr("x",f.iw+(narrow?40:0)).attr("y",N*rh-10).style("font-size",narrow?"26px":null);
  RC={f,C,cs,N,rh,narrow,pos:{},beats:raceBeats(C)};
  setRaceYear(rcYear);
}
// commentary: numbers come from the data for whichever reporter type is selected
function raceBeats(C){
  const Y=y=>D.years.indexOf(y), tot=(c,y)=>C[c]?d3.sum(Object.values(C[c]),a=>a[Y(y)]||0):0, nm=c=>D.countries[c].n;
  const ml=(c,y)=>D.countries[c]&&"UML".includes((D.countries[c].inc||"N".repeat(19))[Y(y)]);
  const rank=y=>Object.keys(C).filter(c=>ml(c,y)).sort((a,b)=>tot(b,y)-tot(a,y));
  const T=D.rcTot[S.pv], mt=v=>fmtMt(v)+" Mt", B=[], ch="156", ord=n=>n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th");
  const pk=d3.greatest(d3.range(2008,2018),y=>tot(ch,y));
  B.push({y:2008,d:.4,c:[ch],k:"2008",h:`China receives ${mt(tot(ch,2008))}`,s:`${Math.round(tot(ch,2008)/T.mlic[0]*100)}% of plastic sent to middle- and low-income countries`});
  if(pk>2009&&pk<2017)B.push({y:pk,d:.25,c:[ch],k:String(pk),h:`China's imports peak at ${mt(tot(ch,pk))}`});
  if(tot(ch,2017)<tot(ch,2016))B.push({y:2016,c:[ch],k:"2016",h:`China starts to scale down`,s:`${mt(tot(ch,2016))} in 2016, ${mt(tot(ch,2017))} in 2017`});
  B.push({y:2017.5,c:[ch],k:"July 2017",h:`China announces a ban on plastic scrap and other solid waste imports[[china2017]]`});
  B.push({y:2018,c:[ch],k:"2018",h:`China's imports fall to ${mt(tot(ch,2018))}`});
  const sea=["458","704","764","360"].filter(c=>C[c]).sort((a,b)=>tot(b,2018)-tot(a,2018)).slice(0,3);
  B.push({y:2018,d:.8,c:sea,k:"2018",h:`Shipments turn to South-East Asia`,s:sea.map(c=>`${nm(c)} ${mt(tot(c,2018))}`).join(" · ")});
  const TY="Rubber and tyres", ty=(c,y)=>C[c]&&C[c][TY]?C[c][TY][Y(y)]||0:0, tyAll=y=>d3.sum(Object.keys(C).filter(c=>ml(c,y)),c=>ty(c,y));
  const ty20=Object.keys(C).filter(c=>ml(c,2020)).sort((a,b)=>ty(b,2020)-ty(a,2020)).slice(0,3);
  B.push({y:2020,d:.5,c:ty20,m:TY,k:"2020",h:`Tyres and rubber start to stand out`,s:ty20.map(c=>`${nm(c)} ${(ty(c,2020)/1e6).toFixed(2)} Mt`).join(" · ")});
  B.push({y:2021,c:[],k:"January 2021",h:`Basel amendments require prior informed consent to export mixed or contaminated plastic scrap[[baselP]]`});
  const r21=rank(2021), lead=r21.slice(0,5), cr=r21.indexOf(ch)+1;
  B.push({y:2021,c:lead,k:"2021",h:`New leaders: ${lead.slice(0,-1).map(nm).join(", ")} and ${nm(lead[lead.length-1])}`,s:cr>0?`China has dropped to ${ord(cr)}`:""});
  const ty23=Object.keys(C).filter(c=>ml(c,2023)).sort((a,b)=>ty(b,2023)-ty(a,2023)), q=tyAll(2023)/tyAll(2020);
  B.push({y:2023,d:.5,c:ty23.slice(0,1),m:TY,k:"2023",h:q>=1.9&&q<2.2?`Tyres and rubber double to ${mt(tyAll(2023))}`:`Tyres and rubber reach ${mt(tyAll(2023))}`,s:`${nm(ty23[0])} takes ${mt(ty(ty23[0],2023))}, ${Math.round(ty(ty23[0],2023)/tot(ty23[0],2023)*100)}% of all it receives`});
  const yl=2025, L=rank(yl)[0], S2=rank(yl)[1];
  const mats=Object.entries(C[L]).map(([g,a])=>[g,a[Y(yl)]||0]).sort((a,b)=>b[1]-a[1]), mname={"Rubber and tyres":"tyres and rubber","Plastic scrap":"plastic scrap","Textiles":"textiles"};
  B.push({y:yl,d:1,c:[L],k:String(yl),h:`${nm(L)} leads with ${mt(tot(L,yl))}`,s:`${Math.round(mats[0][1]/tot(L,yl)*100)}% of it ${mname[mats[0][0]]||mats[0][0].toLowerCase()} · ${nm(S2)} next at ${mt(tot(S2,yl))}`});
  B.forEach((b,i)=>{b.id=i;if(b.d==null)b.d=1.5;cited("plastics",b.h+(b.s||""))}); // number the citations before the reference list is drawn
  return B;
}
function setRaceYear(y,dt){
  rcYear=y; document.getElementById("rc-range").value=y;
  if(!RC) return;
  const {f,C,cs,N,rh,narrow,pos}=RC, n=D.years.length, T=D.rcTot[S.pv];
  const i0=Math.max(0,Math.min(n-1,Math.floor(y-2008))), i1=Math.min(n-1,i0+1), fr=Math.max(0,Math.min(1,y-2008-i0)), yi=Math.round(y-2008);
  const lerp=a=>a?a[i0]*(1-fr)+a[i1]*fr:0, val=(g,k)=>lerp(g[k]);
  const rows=cs.filter(c=>"UML".includes((D.countries[c].inc||"N".repeat(n))[yi]))
    .map(c=>{const vals=MKEYS.map(k=>val(C[c],k[0]));return {c,label:D.countries[c].n,vals,tot:d3.sum(vals)}})
    .sort((a,b)=>b.tot-a.tot);
  const top=rows.slice(0,N), shown=d3.sum(top,r=>r.tot), wT=lerp(T.world), mT=lerp(T.mlic), hT=lerp(T.hic), oth=Math.max(0,mT-shown);
  const max=Math.max(top.length?top[0].tot:0,oth,1e5);
  const step=[0.25,0.5,1,2,5].find(s=>max/1e6/s<=(narrow?6:10))||10;
  const x=d3.scaleLinear().domain([0,max*1.04]).range([0,f.iw]);
  const ticks=d3.range(0,max*1.04/1e6+1e-9,step).map(v=>v*1e6);
  f.g.select(".grid").selectAll("g").data(ticks,d=>d).join(en=>{const g=en.append("g");g.append("line").attr("y1",-6).attr("y2",(N+1)*rh+10).attr("stroke",css("--border"));g.append("text").attr("y",-10).attr("text-anchor","middle").attr("font-size",12).style("fill",css("--muted")).style("font-family","var(--mono)");return g})
    .attr("transform",d=>`translate(${x(d)},0)`).call(g=>g.select("text").text(d=>d?`${+(d/1e6).toFixed(2)}`:"0 Mt"));
  // rows ease towards their rank, so countries glide past each other
  const k=dt?Math.min(1,dt/160):1, keep=new Set(top.map(r=>r.c));
  top.forEach((r,ri)=>{const tgt=ri*rh;pos[r.c]=pos[r.c]==null?(dt?N*rh:tgt):pos[r.c]+(tgt-pos[r.c])*k;r.py=pos[r.c]});
  Object.keys(pos).forEach(c=>{if(!keep.has(c))delete pos[c]});
  const cap=rcCom?rcCap:null, focus=cap&&cap.c.length?new Set(cap.c):null, mf=cap&&cap.m?MKEYS.findIndex(k=>k[0]===cap.m):-1, dimRow=r=>focus&&mf<0&&!focus.has(r.c);
  const g=f.g.select(".bars").selectAll("g.r").data(top,r=>r.c).join(en=>{const g=en.append("g").attr("class","r");
    MKEYS.forEach(()=>g.append("rect"));g.append("text").attr("class","rc-n").attr("x",-8).attr("y",rh/2+4).attr("text-anchor","end");g.append("text").attr("class","rc-v").attr("y",rh/2+4);return g});
  g.attr("transform",r=>`translate(0,${r.py})`).style("opacity",r=>Math.max(0,Math.min(1,1-(r.py-(N-1)*rh)/rh))*(dimRow(r)?DIM.row:1));
  g.each(function(r){const e=d3.select(this);let x0=0;e.selectAll("rect").each(function(_,j){const v=r.vals[j];d3.select(this).attr("x",x(x0)).attr("y",3).attr("height",rh-6).attr("width",Math.max(0,x(x0+v)-x(x0))).attr("fill",css(MKEYS[j][2])).style("opacity",mf>=0&&j!==mf?DIM.seg:1);x0+=v});
    e.select(".rc-n").text(r.label);e.select(".rc-v").attr("x",x(x0)+6).text(fmtMt(x0))});
  // everyone else, pinned below the race
  const O=f.g.select(".other"), oy=N*rh+10;
  O.selectAll("line").data([0]).join("line").attr("x1",-f.m.l+8).attr("x2",f.iw).attr("y1",oy-4).attr("y2",oy-4).attr("stroke",css("--border")).attr("stroke-dasharray","3 3");
  O.selectAll("rect").data([0]).join("rect").attr("x",0).attr("y",oy+3).attr("height",rh-6).attr("width",x(oth)).attr("fill",css("--d8")).style("opacity",focus||mf>=0?DIM.row:1);
  O.selectAll("text.rc-n").data([0]).join("text").attr("class","rc-n").attr("x",-8).attr("y",oy+rh/2+(narrow?4:-3)).attr("text-anchor","end")
    .selectAll("tspan").data(narrow?["All others"]:["All other middle-","and low-income"]).join("tspan").attr("x",-8).attr("dy",(d,j)=>j?"1.1em":null).text(d=>d);
  O.selectAll("text.rc-v").data([0]).join("text").attr("class","rc-v").attr("x",x(oth)+6).attr("y",oy+rh/2+4).text(fmtMt(oth));
  f.g.select(".rc-yr").text(Math.floor(y+1e-6)>=2026?"2026 (modelled)":Math.floor(y+1e-6));
  // caption and pointer
  const box=document.getElementById("rc-cap");
  box.classList.toggle("on",!!cap);
  if(cap&&box.dataset.id!==String(cap.id)){box.dataset.id=cap.id;
    box.innerHTML=`<span class="k">${cap.k}</span><p class="h">${cited("plastics",cap.h)}</p>${cap.s?`<p class="s">${cited("plastics",cap.s)}</p>`:""}`;
    box.classList.remove("pop");void box.offsetWidth;box.classList.add("pop")}
  if(!cap){box.dataset.id="";box.classList.remove("pop")}
  if(!narrow&&cap) box.style.top=(f.m.t+rh*4.5)+"px";
  const trs=focus&&focus.size<=6?top.filter(r=>focus.has(r.c)):[], A=f.g.select(".ann");
  if(cap&&trs.length&&!narrow){
    const sb=f.svg.node().getBoundingClientRect(), bb=box.getBoundingClientRect(), sc=f.w/sb.width;
    const hb=box.querySelector(".h").getBoundingClientRect(), bx=(hb.left-sb.left)*sc-f.m.l-10, by=(hb.top-sb.top+Math.min(18,hb.height/2))*sc-f.m.t;
    const pts=trs.map(tr=>{if(mf>=0){const a=d3.sum(tr.vals.slice(0,mf)),v=tr.vals[mf];return {c:tr.c,tx:x(a+v/2),ty:tr.py+rh/2}}
      const long=tr.tot>max*.8;return {c:tr.c,tx:long?x(tr.tot)-40:x(tr.tot)+44,ty:long?tr.py+rh-2:tr.py+rh/2}});
    A.selectAll("path").data(pts,d=>d.c).join("path").attr("fill","none").attr("stroke",css("--d4")).attr("stroke-width",1.6).attr("stroke-linecap","round")
      .attr("d",d=>`M${bx},${by}C${(bx+d.tx)/2},${by} ${(bx+d.tx)/2},${d.ty} ${d.tx},${d.ty}`);
    A.selectAll("circle").data(pts,d=>d.c).join("circle").attr("r",4.5).attr("stroke",css("--panel")).attr("stroke-width",1.5).attr("cx",d=>d.tx).attr("cy",d=>d.ty).attr("fill",css("--d4"));
  } else A.selectAll("*").remove();
}
function rcPick(y){const b=RC&&RC.beats;if(!b)return null;let c=null;b.forEach(z=>{if(y>=z.y-1e-6&&y<z.y+z.d)c=z});return c}
(function(){
  const tk=document.getElementById("rc-ticks"); if(!tk)return; const  pc=y=>(y-2008)/18*100;
  const draw=()=>{const w=tk.getBoundingClientRect().width||600, every=w>760?1:w>420?2:6;
    tk.innerHTML=d3.range(2008,2027).map(y=>`<span class="${(y-2008)%every===0||y===2026?"":"n"}" style="left:${pc(y)}%">${y}</span>`).join("")};
  draw(); new ResizeObserver(draw).observe(tk);
})();
function rcStop(){if(rcRAF)cancelAnimationFrame(rcRAF);rcRAF=null;rcHold=0;document.getElementById("rc-play").textContent="Play"}
function rcPlay(){rcStop();document.getElementById("rc-play").textContent="Pause";if(rcYear>=2026)rcYear=2008;rcLast=performance.now();
  rcBeat=RC?RC.beats.findIndex(b=>b.y>=rcYear-1e-6):0; if(rcBeat<0)rcBeat=RC.beats.length;
  const step=now=>{const dt=Math.min(100,now-rcLast);rcLast=now;let y=rcYear;if(!RC){rcRAF=requestAnimationFrame(step);return}
    if(rcHold>now){setRaceYear(y,dt)}
    else{y=Math.min(2026,rcYear+dt/RC_MS);const b=RC&&RC.beats[rcBeat];
      if(b&&y>=b.y){y=b.y;rcBeat++;rcCap=b;if(rcCom)rcHold=now+RC_HOLD}
      else if(rcCap&&y>=rcCap.y+rcCap.d)rcCap=null;
      setRaceYear(y,dt)}
    if(y>=2026&&rcHold<=now){rcStop();return}rcRAF=requestAnimationFrame(step)};rcRAF=requestAnimationFrame(step)}
document.getElementById("rc-play")?.addEventListener("click",()=>rcRAF?rcStop():rcPlay());
document.getElementById("rc-com")?.addEventListener("click",e=>{rcCom=!rcCom;e.currentTarget.setAttribute("aria-pressed",rcCom);e.currentTarget.textContent=rcCom?"Commentary on":"Commentary off";rcHold=0;setRaceYear(rcYear)});
document.getElementById("rc-range")?.addEventListener("input",e=>{rcStop();rcCap=rcPick(+e.target.value);setRaceYear(+e.target.value)});
new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting&&!rcRAF){setRaceYear(2008);rcPlay();o.disconnect()}})},{threshold:.4}).observe(document.getElementById("p-recv")||document.createElement("i"));
let skYear=2016, skTimer=null, SK=null;
const GKEYS=[["HIC","High income","--g-hic"],["UMC","Upper middle income","--g-umc"],["LMC","Lower middle income","--g-lmc"],["LIC","Low income","--g-lic"]];
function buildSankey(){
  const X=D.hicX, v=S.pv;
  const mats=(S.pk==="all"?MKEYS:MKEYS.filter(k=>k[0]==="Plastic scrap"));
  const exps=[...X.top.filter(c=>!(S.hk==="out"&&c==="344")),"other"];
  const keep=r=>exps.includes(r[0])&&mats.some(m=>m[0]===r[1]);
  const narrow=innerWidth<600, L=narrow?56:152, Rm=narrow?128:222;
  const f=frame("#p-hic",narrow?470:540,{t:8,r:Rm,b:34,l:L});
  const YM=X.data[v].map(rs=>{const m=new Map();rs.filter(keep).forEach(r=>m.set(r[0]+"|"+r[1]+"|"+r[2],r));return m});
  const tot=i=>d3.sum([...YM[i].values()],r=>r[3]);
  const maxT=d3.max(D.years.map((y,i)=>tot(i)))||1;
  const gapL=narrow?4:6, gapM=8, gapR=14, avail=f.ih-gapL*(exps.length-1);
  ["ribs","nodes","lead","labs"].forEach(c=>f.g.append("g").attr("class",c));
  const gid="skrisk"+Math.random().toString(36).slice(2,7);
  const gr=f.svg.append("defs").append("linearGradient").attr("id",gid).attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",1);
  gr.append("stop").attr("offset",0).attr("stop-color",css("--risk0"));gr.append("stop").attr("offset",1).attr("stop-color",css("--risk1"));
  f.g.append("g").attr("class","risk");
  SK={f,mats,exps,keep,YM,k:avail/maxT,nw:12,gapL,gapM,gapR,tot,narrow,gid,Rm};
  setSankeyYear(skYear,true);
}
function setSankeyYear(y,instant){
  skYear=y; const yi=Math.round(y); document.getElementById("sk-year").textContent=yi===2026?"2026 (modelled)":yi; document.getElementById("sk-range").value=y;
  if(!SK) return;
  const {f,mats,exps,k,nw,gapL,gapM,gapR,narrow,YM}=SK, X=D.hicX;
  const i0=Math.max(0,Math.min(D.years.length-1,Math.floor(y-2008))), i1=Math.min(D.years.length-1,i0+1), fr=Math.max(0,Math.min(1,y-2008-i0));
  const A=YM[i0], B=YM[i1], rows=[...new Set([...A.keys(),...B.keys()])].map(key=>{const a=A.get(key),b=B.get(key),r=a||b;return [r[0],r[1],r[2],(a?a[3]:0)*(1-fr)+(b?b[3]:0)*fr]});
  const T=d3.sum(rows,r=>r[3]);
  const mlic=d3.sum(rows.filter(r=>r[2]>0),r=>r[3]);
  document.getElementById("sk-total").textContent=`${fmtMt(T)} Mt exported · ${fmtMt(mlic)} Mt to middle- and low-income countries`;
  const sum=fn=>d3.sum(rows.filter(fn),r=>r[3]);
  const ename=c=>c==="other"?(narrow?["Other"]:["Other","high-income"]):[narrow?X.names[c][0]:X.names[c][1]];
  const GNAME=[["High-income"],["Upper-middle-","income"],["Lower-middle-","income"],["Low-income"]];
  const SHORT={"Plastic scrap":"Scrap","Textiles":"Textiles","Rubber and tyres":"Tyres","Refuse-derived fuel":"RDF","Paper and card":"Paper","E-waste":"E-waste"};
  const xm=f.iw/2-nw/2, xr=f.iw-nw;
  let y0=0; const LN=exps.map(c=>{const v=sum(r=>r[0]===c);const n={key:"e"+c,nm:ename(c),col:"--muted",v,y0,h:v*k,x:0,side:"l"};y0+=n.h+gapL;return n});
  const MN0=mats.map(m=>({m,v:sum(r=>r[1]===m[0])})), mh=d3.sum(MN0,d=>d.v*k)+gapM*(mats.length-1);
  y0=Math.max(0,(y0-gapL-mh)/2); const MN=MN0.map(({m,v})=>{const n={key:"m"+m[0],name:narrow?SHORT[m[0]]:m[1].replace(/ \(.*\)$/,""),sub:narrow?"":((m[1].match(/(\(.*\))$/)||[])[1]||""),col:m[2],v,y0,h:v*k,x:xm,side:"m"};y0+=n.h+gapM;return n});
  const GV=GKEYS.map((g,gi)=>sum(r=>r[2]===gi)), gh=d3.sum(GV)*k+gapR*3;
  y0=Math.max(0,(LN.length?LN[LN.length-1].y0+LN[LN.length-1].h:0)-gh)/2; const RN=GKEYS.map((g,gi)=>{const n={key:"g"+gi,nm:narrow?[g[0]]:GNAME[gi],col:g[2],v:GV[gi],y0,h:GV[gi]*k,x:xr,side:"r"};y0+=n.h+gapR;return n});
  const ribs=[];
  const oL=LN.map(n=>n.y0), oMl=MN.map(n=>n.y0), oMr=MN.map(n=>n.y0), oR=RN.map(n=>n.y0);
  LN.forEach((ln,ei)=>MN.forEach((mn,mi)=>{const v=sum(r=>r[0]===exps[ei]&&r[1]===mats[mi][0]),h=v*k;ribs.push({key:ln.key+mn.key,col:mn.col,x0:nw,x1:xm,s0:oL[ei],t0:oMl[mi],h});oL[ei]+=h;oMl[mi]+=h}));
  MN.forEach((mn,mi)=>RN.forEach((rn,gi)=>{const v=sum(r=>r[1]===mats[mi][0]&&r[2]===gi),h=v*k;ribs.push({key:mn.key+rn.key,col:rn.col,x0:xm+nw,x1:xr,s0:oMr[mi],t0:oR[gi],h});oMr[mi]+=h;oR[gi]+=h}));
  const band=r=>{const c=(r.x0+r.x1)/2;return `M${r.x0},${r.s0}C${c},${r.s0} ${c},${r.t0} ${r.x1},${r.t0}L${r.x1},${r.t0+r.h}C${c},${r.t0+r.h} ${c},${r.s0+r.h} ${r.x0},${r.s0+r.h}Z`};
  const t=d3.transition().duration(instant?0:450).ease(d3.easeCubicInOut);
  f.g.select(".ribs").selectAll("path").data(ribs,r=>r.key).join("path").attr("class","rib").attr("fill",r=>css(r.col)).transition(t).attr("d",band);
  const nodes=[...LN,...MN,...RN];
  f.g.select(".nodes").selectAll("rect").data(nodes,n=>n.key).join("rect").attr("fill",n=>css(n.col)).attr("x",n=>n.x).attr("width",nw)
    .transition(t).attr("y",n=>n.y0).attr("height",n=>Math.max(1,n.h));
  const pct=v=>T?Math.round(v/T*100)+"%":"";
  const rx=f.iw+SK.Rm-(narrow?16:22), rt=RN[0].y0+12, rb=RN[3].y0+Math.max(RN[3].h,1)-6;
  const rg=f.g.select(".risk").selectAll("g").data([0]).join(en=>{const g=en.append("g");g.append("rect").attr("class","bar");g.append("path").attr("class","head");g.append("text").attr("class","rl");g.append("text").attr("class","lo");g.append("text").attr("class","hi");return g});
  rg.select(".bar").attr("x",rx-(narrow?6:8)).attr("width",narrow?12:16).attr("rx",3).attr("fill",`url(#${SK.gid})`).transition(t).attr("y",rt).attr("height",Math.max(10,rb-rt-8));
  rg.select(".head").attr("fill",css("--risk1")).transition(t).attr("d",`M${rx-(narrow?12:16)},${rb-10}L${rx+(narrow?12:16)},${rb-10}L${rx},${rb+(narrow?6:9)}Z`);
  rg.select(".rl").attr("text-anchor","middle").attr("font-size",narrow?11.5:13).attr("font-weight",700).style("fill",css("--risk1"))
    .text(narrow?"":"Risk of mismanagement").transition(t).attr("transform",`translate(${rx-(narrow?12:16)},${(rt+rb)/2}) rotate(-90)`);
  rg.select(".lo").attr("text-anchor","middle").attr("font-size",12).attr("font-weight",700).style("fill",css("--muted")).text("Low").transition(t).attr("x",rx).attr("y",rt-4);
  rg.select(".hi").attr("text-anchor","middle").attr("font-size",12).attr("font-weight",700).style("fill",css("--risk1")).text("High").transition(t).attr("x",rx).attr("y",rb+(narrow?32:23));
  const spread=(arr,gap)=>{const G=typeof gap==="function"?gap:()=>gap, lo=5, hi=f.ih+f.m.b-26;
    arr.forEach(n=>n.ly=n.y0+Math.max(n.h,1)/2-8);
    // least-displacement placement: merge overlapping labels into blocks centred on their targets
    let B=[];arr.forEach(n=>{let b={it:[n],h:G(n),want:n.ly};b.top=b.want;B.push(b);
      while(B.length>1){const a=B[B.length-2],c=B[B.length-1];if(a.top+a.h<=c.top)break;
        const it=[...a.it,...c.it];let off=0,acc=0;it.forEach(m=>{acc+=m.ly-off;off+=G(m)});
        const m={it,h:a.h+c.h,want:0};m.top=acc/it.length;B.splice(-2,2,m)}});
    B.forEach(b=>{b.top=Math.max(lo,b.top)});for(let a=B.length-1;a>=0;a--){const lim=a===B.length-1?hi+G(B[a].it[B[a].it.length-1]):B[a+1].top;if(B[a].top+B[a].h>lim)B[a].top=lim-B[a].h}
    B.forEach(b=>{let y=b.top;b.it.forEach(m=>{m.ly=y;y+=G(m)})});return arr};
  const nl=n=>(n.nm||[1]).length, LH=16.5;
  const lab=[...spread(LN.map(n=>({...n})),n=>narrow?18:(nl(n)+1)*LH+2),...spread(MN.map(n=>({...n})),narrow?18:(MN.some(n=>n.sub)?34:18)),...spread(RN.map(n=>({...n})),n=>narrow?47:(nl(n)+2)*LH-1)];
  const lx=n=>n.side==="l"?(narrow?-16:-26):n.side==="r"?f.iw+8:xm+nw+6;
  const gl=f.g.select(".labs").selectAll("g").data(lab,n=>n.key).join(en=>{const g=en.append("g");g.append("text").attr("class","nl");g.append("text").attr("class","nv");g.append("text").attr("class","ns").attr("dy","1.25em");return g});
  gl.attr("class",n=>"sk-"+n.side).attr("text-anchor",n=>n.side==="l"?"end":"start");
  const val=n=>n.v<5e4?"<0.1 Mt":`${fmtMt(n.v)} Mt`+(n.side==="r"?` · ${pct(n.v)}`:"");
  gl.select(".nl").each(function(n){const e=d3.select(this).attr("x",lx(n));if(n.side==="m"){e.text(`${n.name} `);return}
    e.selectAll("tspan").data(n.nm).join("tspan").attr("x",lx(n)).attr("dy",(d,j)=>j?"1.25em":null).text(d=>d)});
  gl.select(".nv").text(n=>n.side==="m"?(narrow?"":val(n)):(narrow&&n.side==="l")?"":val(n)).attr("x",n=>n.side==="m"?null:lx(n)).attr("dy",n=>n.side==="m"?null:`${1.25*nl(n)}em`);
  const UNC=[1,18,73,97];
  gl.select(".ns").text(n=>n.side==="m"?(n.sub||""):n.side==="r"?(narrow?`${UNC[+n.key.slice(1)]}% uncontrolled`:`Uncontrolled waste: ${UNC[+n.key.slice(1)]}%`):"").attr("x",lx)
    .attr("dy",n=>n.side==="r"?`${1.25*(nl(n)+1)}em`:"1.25em").style("fill",n=>n.side==="r"?css("--risk1"):null).style("font-weight",n=>n.side==="r"?600:null);
  gl.each(function(n){if(n.side!=="m")return;const g=d3.select(this),w=g.select(".nl").node().getComputedTextLength();g.select(".nv").attr("x",lx(n)+w+6).attr("dy",null)});
  gl.transition(t).attr("transform",n=>`translate(0,${n.ly})`);
  f.g.select(".lead").selectAll("path").data(lab,n=>n.key).join("path").attr("fill","none").attr("stroke",css("--muted")).attr("stroke-width",.8)
    .transition(t).attr("d",n=>{const cy=n.y0+Math.max(n.h,1)/2, ty=n.ly+4;if(Math.abs(cy-ty)<6)return "M0,0";return n.side==="l"?`M-2,${cy}L${narrow?-5:-8},${cy}L${narrow?-12:-21},${ty}`:n.side==="r"?`M${f.iw+1},${cy}L${f.iw+6},${ty}`:`M${xm+nw+1},${cy}L${xm+nw+5},${ty}`});
}
let skRAF=null, skLast=0;
(function(){
  const tk=document.getElementById("sk-ticks"); if(!tk)return; const  ev=document.getElementById("sk-ev"), pc=y=>(y-2008)/18*100;
  const draw=()=>{const w=tk.getBoundingClientRect().width||600, every=w>760?1:w>420?2:6;
    tk.innerHTML=d3.range(2008,2027).map(y=>`<span class="${(y-2008)%every===0||y===2026?"":"n"}" style="left:${pc(y)}%">${y}</span>`).join("");
    // each label wraps inside the room between its own line and its neighbours'; numbered markers and a key when there is too little room
    const E=[[2018,"China's import ban"],[2021,"Basel plastic rules"],[2025,"Basel e-waste rules"]].map(([y,t])=>({y,t,x:w*(y-2008)/18,l:y>=2024}));
    E.forEach((e,i)=>{const p=E[i-1],n=E[i+1];
      if(!e.l){e.lo=e.x;e.hi=n?(n.l?(e.x+n.x)/2-4:n.x-6):w}else{e.hi=e.x;e.lo=p?(p.l?p.x+6:(p.x+e.x)/2+4):-8}});
    const compact=E.some(e=>e.hi-e.lo<62);
    ev.innerHTML=E.map((e,i)=>compact?`<span class="c" style="left:${e.x}px"><b>${i+1}</b></span>`
      :`<span class="${e.l?"l":""}" style="left:${e.lo}px;width:${e.hi-e.lo}px"><b>${e.y}</b>${e.t}</span>`).join("");
    const hgt=Math.max(18,...[...ev.children].map(c=>c.offsetHeight));
    ev.style.height=hgt+"px"; ev.parentNode.style.paddingTop=(hgt+4)+"px";
    const key=document.getElementById("sk-evkey"); key.classList.toggle("on",compact);
    key.innerHTML=E.map((e,i)=>`<li><i>${i+1}</i><span><b>${e.y}</b> ${e.t}</span></li>`).join("")};
  draw(); new ResizeObserver(draw).observe(tk);
})();
function skStop(){if(skRAF)cancelAnimationFrame(skRAF);skRAF=null;skTimer=null;document.getElementById("sk-play").textContent="Play"}
function skPlay(){skStop();const b=document.getElementById("sk-play");b.textContent="Pause";if(skYear>=2026)skYear=2008;skTimer=1;skLast=performance.now();
  const step=now=>{const dt=Math.min(100,now-skLast);skLast=now;const y=Math.min(2026,skYear+dt/1600);setSankeyYear(y,true);if(y>=2026){skStop();return}skRAF=requestAnimationFrame(step)};skRAF=requestAnimationFrame(step)}
document.getElementById("sk-play")?.addEventListener("click",()=>skTimer?skStop():skPlay());
document.getElementById("sk-range")?.addEventListener("input",e=>{skStop();setSankeyYear(+e.target.value,true)});
new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting&&!skTimer){setSankeyYear(2008,true);skPlay();o.disconnect()}})},{threshold:.5}).observe(document.getElementById("p-hic")||document.createElement("i"));
function stopPlay(){clearInterval(bTimer);bTimer=null;const b=document.getElementById("b-play");if(b)b.textContent="Play"}
document.getElementById("b-play")?.addEventListener("click",e=>{if(bTimer){stopPlay();e.target.dataset.paused="1"}else startPlay()});
document.getElementById("b-range")?.addEventListener("input",e=>{stopPlay();document.getElementById("b-play").dataset.paused="1";setYear(+e.target.value)});

// ================= E-WASTE =================
const EKEYS=[["epcb","Circuit-board scrap (HS 7112.99 at US$1 to 15 per kg)","--m1"],["eprec","Scrap for precious-metal recovery (HS 8549.21, 8549.29)","--m7"],["weee","Electronic assemblies and boards (HS 8549.31, 8549.39)","--m2"],["weeeo","Other electrical and electronic scrap (HS 8549.91, 8549.99)","--m6"]];
const BKEYS=[["ball","All waste batteries, to 2021 (HS 8548.10)","--m5"],["bpba","Lead-acid (HS 8549.11)","--m1"],["bpbo","Other with lead, cadmium or mercury (HS 8549.12)","--d5"],["bsort","Sorted by type, no lead, cadmium or mercury (HS 8549.13)","--m6"],["bunsort","Unsorted, no lead, cadmium or mercury (HS 8549.14)","--m7"],["both","Other battery waste (HS 8549.19)","--m3"]];
const IKEYS=[["H","High-income","--g-hic"],["U","Upper-middle-income","--g-umc"],["M","Lower-middle-income","--g-lmc"],["L","Low-income","--g-lic"]];
const GINC={H:"HIC",U:"UMC",M:"LMC",L:"LIC"};
const GREYLAB="Shipped as used goods, estimate (exporters' reports)";
const greyAt=y=>G&&G.years.find(r=>r.year===y);
const fmtR=(a,b)=>`${fmtMt(a)} to ${fmtMt(b)}`;
function drawEwaste(){
  if(drawn.ewaste) return; drawn.ewaste=true;
  const v=S.pv, E=D.ewaste, n=D.years.length, i23=D.years.indexOf(2023);
  const cust=i=>EKEYS.reduce((t,k)=>t+(E.streams[v][k[0]][i]||0),0);
  const bat=i=>BKEYS.reduce((t,k)=>t+((E.batteries[v][k[0]]||[])[i]||0),0);
  // tiles
  const g23=greyAt(2023), ml=d3.sum(["U","M","L"],g=>E.toInc[v][g][i23]);
  document.getElementById("e-tiles").innerHTML=
    `<div class="all"><b class="num">${fmtMt(cust(i23))}<small>Mt</small></b><span>E-waste in customs records</span></div>`+
    (g23?`<div><b class="num">${fmtR(g23.low_t,g23.high_t)}<small>Mt</small></b><span>Shipped as used goods (estimate)</span></div>`:"")+
    `<div><b class="num">${Math.round(ml/cust(i23)*100)}%</b><span>In customs records, sent to middle- and low-income countries</span></div>`+
    `<div><b class="num">${fmtMt(bat(i23))}<small>Mt</small></b><span>Waste batteries</span></div>`;
  // 1. customs e-waste by type, with the used-goods estimate on top
  const band=D.years.map((y,i)=>{const r=greyAt(y),b=cust(i);return r?{y,b,lo:b+r.low_t,mid:b+r.central_t,hi:b+r.high_t,r}:null});
  const top=d3.max(D.years.map((y,i)=>band[i]?band[i].hi:cust(i)));
  const ymax=d3.scaleLinear().domain([0,top*1.05]).nice(5).domain()[1];
  legend("#e-all-leg",EKEYS);
  d3.select("#e-all-leg").append("li").html(`<i style="background:var(--res);opacity:.45"></i><span>${GREYLAB}<small>(band: 33% to 70% of flagged used goods counted as e-waste; line: central estimate)</small></span>`);
  const c=stackChart("#e-all",EKEYS,(k,i)=>E.streams[v][k][i],{ymax});
  if(G){
    const pts=band.filter(Boolean), {f,x,y}=c;
    f.g.append("path").attr("d",d3.area().x(d=>x(d.y)).y0(d=>y(d.lo)).y1(d=>y(d.hi)).curve(d3.curveMonotoneX)(pts)).attr("fill",css("--res")).attr("opacity",.42);
    f.g.append("path").attr("d",d3.line().x(d=>x(d.y)).y(d=>y(d.mid)).curve(d3.curveMonotoneX)(pts)).attr("fill","none").attr("stroke",css("--res")).attr("stroke-width",2).attr("stroke-dasharray","5 4");
    const L=pts.find(d=>d.y===2019);
    if(L&&innerWidth>760) f.g.append("text").attr("x",x(2019)).attr("y",y(L.hi)-10).attr("text-anchor","middle").attr("font-size",13.5).attr("font-weight",600).style("fill",css("--ink")).text("Shipped as used goods (estimate)");
    // hover: one strip per year with every figure for that year
    const w=x(2009)-x(2008);
    f.g.selectAll(".hv").data(D.years).join("rect").attr("x",yy=>x(yy)-w/2).attr("y",0).attr("width",w).attr("height",f.ih).attr("fill","transparent")
      .append("title").text((yy,i)=>{const b=band[i];return `${yy}${yy>=2026?" (modelled)":yy>=2025?" (partly modelled)":""}\n`+EKEYS.map(k=>`${k[1].replace(/ \(.*$/,"")}: ${fmtMt(E.streams[v][k[0]][i])} Mt`).join("\n")+
        `\nIn customs records: ${fmtMt(cust(i))} Mt`+(b?`\nShipped as used goods (estimate): ${fmtR(b.r.low_t,b.r.high_t)} Mt, central ${fmtMt(b.r.central_t)} Mt`+(b.r.carried_t?`\n  of the flagged goods, ${Math.round(b.r.carried_t/b.r.scaled_t*100)}% carried forward from senders' earlier reports`:""):"")});
  }
  // 2. by receiving income group
  legend("#e-inc-leg",IKEYS); legend("#e-ginc-leg",IKEYS);
  stackChart("#e-inc",IKEYS,(k,i)=>E.toInc[v][k][i],{h:innerWidth>760?300:240});
  if(G) stackChart("#e-ginc",IKEYS,(k,i)=>{const r=greyAt(D.years[i]);return r?(r.to_income[GINC[k]]||0):0},{h:innerWidth>760?300:240});
  // 3. largest senders and receivers
  const yr=+S.ey, iy=D.years.indexOf(yr), gy=greyAt(yr);
  document.getElementById("e-top-title").textContent=`Largest senders and receivers of e-waste, ${yr}`;
  const nm=c=>(E.names[c]||(G&&G.names[c])||c);
  const TK=[["c","E-waste in customs records","--m2"],["g","Shipped as used goods (central estimate, line shows the range)","--res"]];
  legend("#e-top-leg",TK);
  [["from","#e-from"],["to","#e-to"]].forEach(([side,sel])=>{
    const cu=Object.fromEntries((E[side][v][iy]||[]).map(([cc,t])=>[cc,t])), gr=gy?(gy[side]||{}):{};
    const lo=gy?gy.low_t/gy.central_t:1, hi=gy?gy.high_t/gy.central_t:1;
    const cs=[...new Set([...Object.keys(cu),...Object.keys(gr)])].map(cc=>({cc,c:cu[cc]||0,g:gr[cc]||0})).sort((a,b)=>(b.c+b.g)-(a.c+a.g)).slice(0,12);
    ebars(sel,cs.map(r=>({label:nm(r.cc),c:r.c,g:r.g,glo:r.g*lo,ghi:r.g*hi})),TK);
  });
  // 4. batteries
  legend("#e-bat-leg",BKEYS);
  stackChart("#e-bat",BKEYS,(k,i)=>(E.batteries[v][k]||[])[i]||0,{});
  refList("ewaste","#e-refs");
}
function ebars(sel,rows,keys){
  const rh=26, f=frame(sel,rows.length*rh+30,{t:4,r:64,b:24,l:innerWidth>760?170:120});
  const max=d3.max(rows,r=>r.c+r.ghi)||1;
  const x=d3.scaleLinear().domain([0,max]).nice(4).range([0,f.iw]);
  const kt=t=>t>=1e6?fmtMt(t)+" Mt":Math.round(t/1e3)+" kt";
  f.g.append("g").attr("class","ax").attr("transform",`translate(0,${rows.length*rh})`).call(d3.axisBottom(x).ticks(4).tickFormat(v=>v?kt(v):"0").tickSizeOuter(0));
  rows.forEach((r,i)=>{
    const g=f.g.append("g").attr("transform",`translate(0,${i*rh})`);
    g.append("text").attr("x",-8).attr("y",rh/2+4).attr("text-anchor","end").attr("font-size",14).style("fill",css("--ink")).text(r.label);
    g.append("rect").attr("x",0).attr("y",4).attr("height",rh-8).attr("width",x(r.c)).attr("fill",css(keys[0][2]));
    if(r.g){
      g.append("rect").attr("x",x(r.c)).attr("y",4).attr("height",rh-8).attr("width",x(r.c+r.g)-x(r.c)).attr("fill",css(keys[1][2])).attr("opacity",.75);
      g.append("line").attr("x1",x(r.c+r.glo)).attr("x2",x(r.c+r.ghi)).attr("y1",rh/2).attr("y2",rh/2).attr("stroke",css("--ink")).attr("stroke-width",1.4);
      [r.glo,r.ghi].forEach(t=>g.append("line").attr("x1",x(r.c+t)).attr("x2",x(r.c+t)).attr("y1",rh/2-5).attr("y2",rh/2+5).attr("stroke",css("--ink")).attr("stroke-width",1.4));
    }
    g.append("text").attr("x",x(r.c+Math.max(r.g,r.ghi))+6).attr("y",rh/2+4).attr("font-size",13).style("fill",css("--ink")).text(kt(r.c+r.g));
    g.append("title").text(`${r.label}\nIn customs records: ${kt(r.c)}`+(r.g?`\nShipped as used goods (estimate): ${kt(r.glo)} to ${kt(r.ghi)}, central ${kt(r.g)}`:""));
  });
}

Promise.all([fetch("data/stories.json").then(r=>r.json()),fetch("data/world-110m.json").then(r=>r.json()),
  cur==="ewaste"?fetch("data/grey_ewaste.json").then(r=>r.json()).catch(()=>null):null]).then(([d,w,g])=>{D=d;W=w;G=g;renderFoot(d.built||"");show()});
show();
