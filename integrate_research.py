#!/usr/bin/env python3
"""
Integrates research data (news items + icebreakers) into each company
in the CO array inside index.html.

For each company, inserts:
  - news:[...] array BEFORE the ice: field
  - icebreakers:[...] array AFTER the ice: field
"""

import re
import sys

import os

# Accept file path from CLI arg, fall back to repo-relative default
INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")

# Research data keyed by the EXACT name as it appears in the HTML
# Each entry: { "news": [...], "icebreakers": [...] }
RESEARCH = {}

def n(h, s, d):
    """Helper to build a news item dict."""
    return {"h": h, "s": s, "d": d}

# ── id:1 Bitty ──
RESEARCH["Bitty"] = {
    "news": [
        n("OppFi acquires 35% equity stake in Bitty for ~$18M",
          "BusinessWire, Aug 2024",
          "OppFi paid $15.25M cash + $2.7M stock for 35% stake. Options to increase to full ownership by 2030."),
        n("Bitty launches fixed-term small business loan program",
          "deBanked, Aug 2025",
          "New installment-style loan rolling out Sept 2025, starting in Texas. Complements existing revenue-based financing."),
        n("Cloudsquare CRM integrates with Bitty Advance via API",
          "deBanked, Jan 2025",
          "Salesforce-powered broker CRM added direct API for automated submissions and same-day approvals."),
    ],
    "icebreakers": [
        "I saw OppFi took a 35% stake at a 6x multiple on your net income -- that is a strong endorsement. Now with the path to full ownership by 2030, how is that partnership shaping your product roadmap?",
        "Congrats on launching the fixed-term loan product in September. Expanding from pure revenue-based financing into installment loans is a big shift -- are brokers sending you a different borrower profile now?",
        "The Cloudsquare API integration in January is a big deal for broker workflow. Has automated submission changed the volume or quality of deals coming through your ISO channel?",
        "With $420M funded to 29K+ merchants and OppFi backing you with public-company resources, what is the biggest bottleneck to scaling from here -- capital, distribution, or something else?",
    ],
}

# ── id:5 Fundfi ──
RESEARCH["Fundfi"] = {
    "news": [
        n("Fundfi expands credit facility twice in 2025",
          "deBanked, Apr & Sep 2025",
          "Doubled credit facility twice in one year to support record origination volumes across North America."),
        n("Two new product launches: loan product & credit splits",
          "deBanked, Dec 2025",
          "Launched traditional loan product and credit splits program letting businesses allocate card processing revenues toward repayment."),
        n("New Alabama office + US-Canada cross-border positioning",
          "Yahoo Finance, Jul 2025",
          "Opened Southeast regional hub in Alabama, positioned as cross-border specialist amid evolving US-Canada trade dynamics."),
    ],
    "icebreakers": [
        "You doubled your credit facility twice in one year -- April and September. That capital acceleration usually signals the origination engine is really humming. What is driving that record merchant demand?",
        "The credit splits product is a clever concept -- directing card processing revenue toward repayment. How has broker adoption been so far?",
        "Opening Alabama as a Southeast hub while leaning into US-Canada cross-border expertise is interesting. Are Canadian merchants coming to you with different needs than a year ago?",
        "Going from revenue-based financing into traditional loans and credit splits in the same quarter shows serious product ambition. Is the vision to become a full-stack platform?",
    ],
}

# ── id:6 FundKite ──
RESEARCH["FundKite"] = {
    "news": [
        n("FundKite launches Merchant Services division",
          "deBanked, Jul 2024",
          "New payment processing division supporting all major cards, ACH, digital wallets. Surcharging options lower fees 10-20%."),
        n("$900M+ total funding milestone with $70M revenue",
          "GetLatka, 2024",
          "Crossed $900M deployed since 2015. $70M annual revenue with lean 91-person team shows strong unit economics."),
        n("Alex Shvarts featured on Fintech Newscast",
          "Fintech Newscast, May 2024",
          "CEO discussed proprietary tech enabling daily MCA reconciliation vs industry standard monthly."),
    ],
    "icebreakers": [
        "The Merchant Services division is smart -- turning FundKite into both processor and funder creates real stickiness. Are merchants converting from processing to funding or the other way?",
        "Hitting $70M revenue with 91 people is remarkable efficiency. How much of that edge comes from the homegrown tech stack versus the underwriting model?",
        "You have crossed $900M in total funding. At this rate the billion-dollar milestone is within reach. Is the Merchant Services division changing how you acquire and retain merchants?",
        "Alex built FundKite's technology from scratch -- rare in a space where most buy off-the-shelf. What is the next major capability you are building internally?",
    ],
}

# ── id:2 BriteCap Financial ──
RESEARCH["BriteCap Financial"] = {
    "news": [
        n("Surpasses $1 billion in total originations",
          "PR Newswire, Feb 2026",
          "Crossed $1B in Dec 2025 with 55% YoY origination growth -- strongest year in company history."),
        n("Launches BriteLine for on-demand business capital",
          "PR Newswire, May 2025",
          "Single approval unlocks future draws based on performance -- revolving line concept for alt lending."),
        n("Jim Noel hired as VP Strategic Partnerships + $150M facility",
          "PR Newswire, Aug-Oct 2024",
          "20+ year vet from CAN Capital joins. $150M 3-year revolving receivable financing facility secured."),
    ],
    "icebreakers": [
        "Congrats on crossing a billion in originations with 55% YoY growth. You mentioned exciting innovations for 2026 -- can you give us a preview?",
        "BriteLine is an interesting concept -- single approval with performance-based draws. How are brokers positioning it compared to a standard advance?",
        "Bringing Jim from CAN Capital right after the $150M facility looks like a deliberate one-two punch for scaling. How has the partner network grown since Jim came on?",
        "Growing originations 55% while strengthening credit discipline is not easy. What operational changes made it possible to grow faster and tighten underwriting simultaneously?",
    ],
}

# ── id:7 Vox Funding ──
RESEARCH["Vox Funding"] = {
    "news": [
        n("Secures $150M credit facility from Raven Capital",
          "BusinessWire, May 2025",
          "Expanded flexible financing for US businesses. Over $750M funded since 2018 founding."),
        n("CEO Adam Benowitz launches BRIX Funding for construction",
          "EINPresswire, 2025",
          "Sister venture reducing contractor payment from 83 days to 24 hours. $20M pre-money seed round."),
        n("VOX team at deBanked CONNECT 2026",
          "citybiz, Feb 2026",
          "Adam Benowitz joined Funding Deals panel. Louis Calderone serves as President & Co-Founder."),
    ],
    "icebreakers": [
        "Congrats on the $150M facility with Raven Capital -- major confidence signal. With $750M+ funded since 2018, what areas will the extra capital unlock?",
        "I noticed Adam is also building BRIX Funding for construction -- reducing payment from 83 days to 24 hours. How does VOX experience inform what you are building there?",
        "VOX has been on a strong trajectory since 2018 with institutional backing now. What separates VOX for ISOs evaluating funding partners in this crowded market?",
        "I saw the team was at deBanked CONNECT -- those events surface real conversations. What themes are you hearing most from brokers and merchants right now?",
    ],
}

# ── id:3 PIRS Capital ──
RESEARCH["PIRS Capital"] = {
    "news": [
        n("Crain's NY Fast 50 + Inc. 5000 recognition",
          "Crain's/Inc., 2024",
          "230% three-year revenue growth. Opportunities Fund returned 20% net for 2024."),
        n("PIRScore proprietary credit scoring model",
          "PYMNTS, 2024",
          "ML model analyzing 50+ algorithms and hundreds of proprietary data points for merchant risk."),
        n("Andrew Mallinger on FunderIntel podcast",
          "FunderIntel, 2024",
          "COO discussed revenue-based financing strategy. PIRS at RBFC golf outing showing industry engagement."),
    ],
    "icebreakers": [
        "Your Opportunities Fund posted 20% net returns for 2024 -- PIRScore is doing its job on risk. How has the model evolved as eCommerce has changed?",
        "With Amazon launching its own MCA program via Parafin, how do you see the eCommerce lending landscape shifting for PIRS?",
        "230% three-year growth on Crain's Fast 50 is impressive. Is the plan to stay specialized in eCommerce or expand PIRScore into other verticals?",
        "PIRScore analyzing 50+ algorithms sets you apart from generic FICO analysis. For an Amazon FBA seller, what does PIRScore see that a traditional underwriter would miss?",
    ],
}

# ── id:8 CAN Capital ──
RESEARCH["CAN Capital"] = {
    "news": [
        n("Completes $175M term debt securitization",
          "PR Newswire, Jun 2024",
          "First securitization since 2014. $50M VFN + $125M ABS rated A/BBB/BB- by KBRA. Guggenheim advised."),
        n("Over $8B deployed across 200K+ transactions",
          "CAN Capital, ongoing",
          "Industry pioneer since 1998 continues expanding into term loans and equipment financing alongside core MCA."),
        n("2-year tech modernization completed",
          "CAN Capital Blog, 2024",
          "Cloud migration and risk model modernization under CEO Ed Siciliano positions 26-year-old company for next phase."),
    ],
    "icebreakers": [
        "Landing a $175M securitization with investment-grade ratings -- your first since 2014 -- is huge credibility for the whole MCA space. How has institutional appetite for alt lending paper changed?",
        "CAN Capital invented the MCA category in 1998. Now with the tech modernization done, how is the new infrastructure changing underwriting speed and quality?",
        "Over $8B across 200K+ transactions is an unmatched track record. With the stack modernized under Ed Siciliano, what does the next chapter look like?",
        "Adding equipment financing alongside your core MCA -- is that in response to merchant demand or about broadening the relationship in the CAN ecosystem?",
    ],
}

# ── id:9 Dexly Finance ──
RESEARCH["Dexly Finance"] = {
    "news": [
        n("Positions as ISO-first direct capital provider",
          "Dexly Finance, 2024-2025",
          "Launched with explicitly ISO-first approach emphasizing speed, certainty, and broker-protected relationships."),
        n("CEO Burkay Kaplan brings unique angel investor background",
          "burkaykaplan.com",
          "Harvard Business School alum, 70+ angel investments including Chainlink & Polygon. Member of $6B+ Blockchain Investors Consortium."),
        n("Dexly differentiates through clean execution model",
          "Dexly Finance, 2025",
          "Emphasizes certainty of close, transparent deal structures, and ISO relationship protection."),
    ],
    "icebreakers": [
        "Burkay, 70+ angel investments including Chainlink and Polygon, HBS, and now running a direct funder. What made you bring that tech and venture lens into merchant cash advance?",
        "The ISO-first positioning is bold. A lot of funders say broker-friendly but you made it core identity. What specifically are you doing differently to protect broker relationships?",
        "With your experience investing in blockchain at the earliest stages, where is tech actually moving the needle in MCA underwriting versus where it is still hype?",
        "Dexly emphasizes clean execution and certainty of close -- the exact pain points ISOs complain about most. How are you structuring operations to deliver consistently?",
    ],
}

# ── id:10 Aspire Funding Platform ──
RESEARCH["Aspire Funding Platform"] = {
    "news": [
        n("CEO Daniel Lenefsky at deBanked Broker Fair 2025",
          "deBanked, 2025",
          "Represented Aspire at premier broker event and B2B Finance Expo."),
        n("Team expansion: Ricky Singh as Ops & Marketing Manager",
          "ZoomInfo, Feb 2025",
          "Signaling investment in operational capacity and go-to-market efforts."),
        n("Aspire model: API/OCR + veteran underwriters",
          "deBanked TV, 2025",
          "Same-day/24hr funding with up to 17-point ISO commissions."),
    ],
    "icebreakers": [
        "I saw you at both Broker Fair 2025 and B2B Finance Expo -- strong event presence. How is the reception from ISOs on the 17-point commission structure?",
        "Combining API/OCR tech with veteran human underwriters is an interesting hybrid. What made you decide the sweet spot is in the middle rather than going all-in on automation?",
        "Congrats on bringing Ricky Singh aboard for Ops & Marketing. Investing in both simultaneously usually signals a scaling inflection point -- is that what you are seeing?",
        "Same-day funding is table stakes in MCA, but delivering consistently is another story. What does Aspire's process look like under the hood to reliably hit those timelines?",
    ],
}

# ── id:11 Simply Funding ──
RESEARCH["Simply Funding"] = {
    "news": [
        n("deBanked feature: A Glimpse at Simply Funding",
          "deBanked, Jan 2025",
          "Doubled funding volume in consecutive years since Jacob Kleinberger joined as partner in 2021. Pure ISO-only model."),
        n("ACHWorks and Onyx IQ power Simply Funding's ops",
          "PR Newswire, 2023",
          "Integrated wiring, ACH, syndicator debiting, and commission payments. New ISOs fund in 2-4 weeks."),
        n("Ethical standards and transparency emphasized",
          "deBanked, Jan 2025",
          "Own capital at risk, not outside investors -- transparency and ethics are non-negotiable."),
    ],
    "icebreakers": [
        "The deBanked profile was a great read -- doubling volume two years running is impressive. What is the key driver: more ISOs, better approval rates, or larger deal sizes?",
        "I like the pure ISO-only shop with no inside sales competing for deals. How do ISOs react when they realize there is zero channel conflict?",
        "Jacob, the Onyx IQ and ACHWorks integration powering your back office is a strong stack for 28 people. How much of the ability to double volume comes from that infrastructure versus relationships?",
        "Putting your own capital at risk rather than outside investors gives you a different perspective on underwriting quality. How does that ownership structure shape your risk appetite?",
    ],
}

# ── id:12 MonetaFi ──
RESEARCH["MonetaFi"] = {
    "news": [
        n("MonetaFi launches May 2025 with industry veterans",
          "EINPresswire, May 2025",
          "New MCA funder with Steve Kamhi bringing decades of experience helping ISOs close deals faster."),
        n("Lending-as-a-Service white-label platform",
          "MonetaFi, 2025",
          "Partners can white-label the lending platform with own branding without building in-house lending team."),
        n("Same-day funding with approvals up to $750K in all 50 states",
          "MonetaFi, 2025",
          "Soft-pull pre-approvals, real-time status updates, minimal docs, flexible underwriting."),
    ],
    "icebreakers": [
        "Launching a new MCA funder in 2025 takes conviction -- what gap did the MonetaFi team see that made you say now is the time with so many funders already?",
        "The Lending-as-a-Service white-label model is genuinely differentiated. What is the reaction from ISOs when they realize they can put their own brand on the entire experience?",
        "Same-day funding with soft-pull pre-approvals sounds like it was designed by someone who has lived the ISO pain points. How much of the roadmap came directly from broker feedback?",
        "Building partner-first from day one rather than retrofitting -- what does that let you do structurally that established funders cannot easily replicate?",
    ],
}

# ── id:13 Elevate Funding ──
RESEARCH["Elevate Funding"] = {
    "news": [
        n("CEO Heather Francis serves on SBFA Board",
          "FunderIntel, ongoing",
          "Actively working with state and federal regulators to shape MCA industry best practices."),
        n("MCA Myths Debunked content series with Ken Peng",
          "FunderIntel/Elevate Blog, 2023-2025",
          "Multi-part educational series addressing common MCA misconceptions, positioning Elevate as thought leader."),
        n("Operational expansion: online checkout, underwriting team growth",
          "Elevate Funding, 2024",
          "Implementing online checkout, expanding partner resources with video walkthroughs, growing UW team."),
    ],
    "icebreakers": [
        "Heather, your SBFA board work is shaping how the entire MCA industry gets regulated. With states like Texas introducing new disclosure requirements, where is the regulatory landscape headed in 2026?",
        "Ken Peng's MCA Myths Debunked series is some of the best educational content in the space. Has that thought leadership translated into ISO partner acquisition?",
        "Elevate has been deliberate about not condoning stacking and focusing on merchant health. How do you balance that principle with growth targets?",
        "You expanded the underwriting team and rolled out online checkout in 2024 -- the moves of a company preparing to scale. What does the next year look like for Elevate?",
    ],
}

# ── id:4 Wing Lake Capital Partners ──
RESEARCH["Wing Lake Capital Partners"] = {
    "news": [
        n("Capstone Fund launched with $50M+ for growth-stage businesses",
          "deBanked/Crain's Detroit",
          "Targets businesses emerged from distress, offering lower-rate 3-year term loans."),
        n("deBanked CONNECT Miami 2025 sponsorship",
          "LinkedIn, Jan-Feb 2025",
          "Sarah Annas and Angelina Fletcher represented Wing Lake. Sponsored RBFC drink cart."),
        n("Back to Business podcast launch",
          "Wing Lake Capital, ongoing",
          "Thought leadership platform featuring team members on leadership and remote work."),
    ],
    "icebreakers": [
        "The Franklin/Capstone two-fund model is smart -- clean up the MCA stack, then step in with growth capital. How often does a merchant graduate from one fund to the other?",
        "I saw Sarah and the team at deBanked CONNECT Miami sponsoring the RBFC drink cart. Operating outside the typical NY funding corridor, does that give you a different perspective?",
        "Your Capstone Fund targets businesses through distress into growth but still outside traditional bank eligibility. What does your qualification process focus on that banks miss?",
        "I have been listening to your Back to Business podcast. Is it bringing inbound deal flow or more of a culture and recruiting play?",
    ],
}

# ── id:17 idea Financial ──
RESEARCH["idea Financial"] = {
    "news": [
        n("Secures $20M corporate term loan from EverBank",
          "PR Newswire, Jan 2026",
          "Accelerating growth in SMB lending and legal financing. Surpassed $1B in total originations."),
        n("Secures $50M warehouse facility with Performance Trust",
          "deBanked, Oct 2024",
          "Max line of credit raised from $250K to $350K per borrower."),
        n("CEO Justin Leto interview on fintech strategy",
          "EKMH Innovators",
          "Discusses origin story as attorneys-turned-fintech entrepreneurs, LevelEsq litigation platform."),
    ],
    "icebreakers": [
        "Congrats on crossing the $1B origination milestone -- serious inflection point in eight years. Is the priority deepening LevelEsq or expanding the core SMB credit line further?",
        "The Performance Trust facility bumped your max to $350K -- meaningful jump. Are you seeing demand from merchants who were capped at $250K needing extra headroom?",
        "Justin's background from practicing attorney to fintech CEO is unique in alt lending. Has that legal training shaped how idea Financial approaches underwriting or compliance differently?",
        "Back-to-back capital raises -- $50M warehouse and $20M term loan -- signal institutional confidence. What has the growth trajectory looked like operationally?",
    ],
}

# ── id:18 Gulf Coast Business Credit ──
RESEARCH["Gulf Coast Business Credit"] = {
    "news": [
        n("Celebrates 25th anniversary in 2025",
          "GCBC, 2025",
          "Founded 2000 as division of Gulf Coast Bank & Trust. Now finances over $3B annually."),
        n("Strong 2024 performance across all divisions",
          "GCBC, 2024",
          "Growth in deposits, loans, trust assets, and mortgage. Reflects strength of $1.8B parent bank."),
        n("Stuart Wrba active in staffing & transportation deals",
          "GCBC News",
          "Closing notable deals including $7M facility for California staffing company."),
    ],
    "icebreakers": [
        "Congrats on GCBC hitting 25 years -- that is a remarkable run, especially growing to $3B in annual financing. What has been the biggest evolution in AR finance since 2000?",
        "Stuart, that $7M facility for the California staffing company stood out. Are staffing and transportation where you see the most growth, or is oil and gas picking back up?",
        "Being backed by a $1.8B FDIC-insured bank gives you a stability story independent factoring shops cannot match. How much does that come up in competitive situations?",
        "With growth across every division at the parent bank in 2024, the wind is at your back. Is GCBC expanding geographically or deepening existing verticals?",
    ],
}

# ── id:19 Spartan Capital ──
RESEARCH["Spartan Capital"] = {
    "news": [
        n("Appoints Terence Walsh as CFO",
          "Yahoo Finance, Apr 2025",
          "Previously VP Finance at Fora Financial helping originate $1B+ in debt capital."),
        n("Daniela Cano & Nicole Paliobeis profiled for $100M+ origination",
          "deBanked, Dec 2025",
          "Top two ISO managers originate $10M/month, showcasing broker-driven model."),
        n("Frank Ebanks interview on The Spartan Way",
          "FunderIntel",
          "CEO discusses accessible leadership, API submissions, and scaling strategy."),
    ],
    "icebreakers": [
        "The Terence Walsh CFO hire is a strong signal -- his Fora Financial track record originating $1B+ means he knows the playbook. Is the plan to pursue larger facilities or a bigger strategic move?",
        "That deBanked piece on Daniela and Nicole was impressive -- $10M/month between two people. What is it about Spartan's model that lets individual RMs produce at that volume?",
        "Frank, I have heard you described as the CEO who picks up the phone at 6 AM or 11 PM. How much of Spartan's growth comes from that hands-on culture versus the tech?",
        "Growing to $100M+ originations without outside VC is rare. Now with a CFO from institutional capital markets, does that signal bringing in outside capital to accelerate?",
    ],
}

# ── id:15 Rapid Finance ──
RESEARCH["Rapid Finance"] = {
    "news": [
        n("Launches SPADE AI tool cutting processing 95%",
          "Business Wire, Jun 2025",
          "Smart Processing and Data Extraction module goes from 20 minutes to 20 seconds per application."),
        n("Mark Cerminaro at Q2Connect25 on embedded lending",
          "CU Broadcast, 2025",
          "CRO discusses credit union partnerships for SMB financing without balance sheet risk."),
        n("SMB Disclosure Service for Missouri compliance",
          "Rapid Finance, Feb 2025",
          "Standalone Regtech SaaS module for Missouri commercial disclosure requirements."),
    ],
    "icebreakers": [
        "SPADE going from 20 minutes to 20 seconds is not incremental -- that is fundamental rethinking. Is accuracy holding up at that speed, or is there still a human-in-the-loop for edge cases?",
        "Mark's Q2Connect25 pitch on embedded lending for credit unions is a big strategic bet. How much traction is that channel getting compared to direct origination?",
        "With $5B deployed and now building compliance SaaS tools, Rapid is evolving from a lender into a lending infrastructure company. Is that a fair read of where Will Tumulty is steering things?",
        "Lynx + SPADE + embedded API is starting to look like a full-stack lending OS. Are you positioning as the technology layer that powers SMB lending nationally?",
    ],
}

# ── id:16 Forward Financing ──
RESEARCH["Forward Financing"] = {
    "news": [
        n("Jason Mullins named President and CEO",
          "PR Newswire, Jan 2025",
          "Previously CEO of goeasy Ltd where he grew portfolio 5x and revenue 3x. Justin Bakes became Executive Chairman."),
        n("Credit facility expanded to $450M",
          "Fintech Global, Sep 2024",
          "Nearly doubled from $250M, substantially increasing funding capacity."),
        n("Multiple industry awards and recognition",
          "Boston Business Journal, 2024-2025",
          "Silver Stevie Awards, Great Place to Work, six Built In Best Places lists, named largest MA fintech."),
    ],
    "icebreakers": [
        "Bringing in Jason Mullins from goeasy -- where he grew portfolio 5x -- combined with doubling the facility to $450M signals a serious scale-up phase. What is the strategic vision under new leadership?",
        "Being 100% employee-owned with 500+ people across three countries is genuinely distinctive. How does that ownership structure affect culture in a high-volume sales environment?",
        "Jill, with the facility at $450M, is the expanded capacity translating into larger deal sizes or more volume at the same ticket?",
        "Stevie Awards for both CSR and Customer Service is unusual. What is Forward doing on the social responsibility side that earned recognition alongside the service win?",
    ],
}

# ── id:20 Likety ──
RESEARCH["Likety"] = {
    "news": [
        n("Nima Shamsili AMA with Rebuy Ecommerce Community",
          "Rebuy Engine, Dec 2024",
          "Fielded questions about inventory capital, ad spend, and working capital for ecommerce founders."),
        n("Community spotlight on Rebuy Engine",
          "Rebuy, 2024",
          "Highlighted how Nima helps ecommerce founders navigate funding, drawing on own wellness brand experience."),
        n("Head of Community hired",
          "LinkedIn, Jan 2025",
          "Nahal Garakani joins as Head of Community, signaling push beyond just funding."),
    ],
    "icebreakers": [
        "I saw your AMA with the Rebuy community -- the questions founders asked about inventory financing were telling. Are you seeing the same pain points or is it shifting as ecommerce matures?",
        "Going from running your own ecommerce brand to building Likety gives you a perspective most fintech CEOs do not have. How much does that founder experience shape your underwriting?",
        "Hiring a Head of Community is a deliberate move -- building Likety into more than just capital. What is the vision behind that investment?",
        "A lot of ecommerce brands say banks still do not understand their model -- no collateral, seasonal spend, fast turns. Is that disconnect still as wide as when you started Likety?",
    ],
}

# ── id:21 United Capital Source ──
RESEARCH["United Capital Source"] = {
    "news": [
        n("Jared Weitz featured in LegalZoom interview",
          "LegalZoom, 2025",
          "Discussed AI and alternative underwriting closing the capital access gap."),
        n("Forbes Finance Council and YEC thought leadership",
          "Forbes/YEC, 2024-2025",
          "Board member publishing on fintech trends, digital wallets, and SMB financing strategy."),
        n("SBFA Broker Council Chairman",
          "deBanked, ongoing",
          "Co-chairs council focused on transparency, responsibility, fairness, and security standards for brokers."),
    ],
    "icebreakers": [
        "Jared, your LegalZoom interview on AI-driven underwriting closing the capital gap was interesting. Where is AI making the biggest practical difference -- origination, underwriting, or post-funding?",
        "Between Forbes Finance Council, YEC, and SBFA Broker Council chairmanship, you have one of the most visible brands in SMB finance. How much does that thought leadership directly drive deal flow?",
        "You have been vocal about the consultative sale model -- educating clients on all options. How do you maintain that philosophy at scale without sacrificing speed?",
        "The SBFA Broker Council work on transparency is especially relevant with more states rolling out disclosure requirements. Is the priority keeping ahead of state-by-state rules or building a national framework?",
    ],
}

# ── id:22 Big Think Capital ──
RESEARCH["Big Think Capital"] = {
    "news": [
        n("Named Top Business Lending Firm 2024",
          "Financial Services Review, 2024",
          "Recognized for growth since 2017 founding."),
        n("Surpasses $1B in business financing",
          "B2B Reviews, 2024-2025",
          "25,000+ clients served, $1B+ arranged through marketplace platform."),
        n("Tom Forsberg at NY Bankers Association Forum",
          "LinkedIn, 2025",
          "CRO represented syndication investment platform at institutional event in Palm Beach."),
    ],
    "icebreakers": [
        "Congrats on Top Business Lending Firm recognition and crossing the $1B mark. What has been the biggest driver of growth on the syndication side?",
        "The NY Bankers Association Forum is a more institutional crowd than typical alt lending events. Are traditional banks looking to partner with marketplace lenders like Big Think?",
        "Seven years from launch to a billion dollars is a serious trajectory. Where do you see the next leg of growth coming from?",
        "Managing a marketplace spanning SBA to revenue-based financing is a wide spectrum. How do you balance product breadth with syndication investor risk profiles?",
    ],
}

# ── id:14 Velocity Capital Group ──
RESEARCH["Velocity Capital Group"] = {
    "news": [
        n("Jesse Guzman hired as Chief Revenue Officer",
          "deBanked, Aug 2024",
          "From Nexi where he led growth through major rebranding. Focus on expanding funding and ISO support."),
        n("Jay Avigdor featured on industry podcasts",
          "Cobalt Intelligence/Authority Magazine, 2024-2025",
          "Career exceeding $850M in sales, AI-driven underwriting claiming 93% accuracy in default prediction."),
        n("Advanced analytics for underwriting",
          "TechBullion",
          "AI examining business owner characteristics, deposit patterns, and transaction history."),
    ],
    "icebreakers": [
        "Bringing Jesse Guzman as CRO from Nexi looks like a move to professionalize revenue. With 40K broker relationships, is the focus on getting more from existing ISOs or expanding the network?",
        "Jay, your $850M career sales story is compelling. Now with a seasoned CRO handling revenue, has that freed you to focus more on strategy?",
        "The 93% accuracy claim on AI default prediction is bold. What data inputs give Velocity that edge -- deposit patterns or something else?",
        "Same-day funding up to $1M with AI decisioning is strong for brokers. How much competitive advantage comes from tech versus the 40K ISO relationships?",
    ],
}

# ── id:23 LoanGeek ──
RESEARCH["LoanGeek"] = {
    "news": [
        n("Named 2025 Broker of the Year by NPLA",
          "Yahoo Finance, Oct 2025",
          "Recognized for excellence in broker leadership, client outcomes, and lender partnerships."),
        n("Launched LiveDeal portal for CRE lenders",
          "deBanked, Sep 2024",
          "Gives lenders real-time access to qualified deals filtered by type, amount, property, geography."),
        n("CEO Chris Pepe interview on transforming CRE lending",
          "TechBullion, Nov 2024",
          "250+ lending partners, mission to help RE investors find optimal non-bank financing."),
    ],
    "icebreakers": [
        "Broker of the Year from NPLA with 250+ lending partners is well-earned. What set LoanGeek apart from other nominees in Scottsdale?",
        "LiveDeal letting lenders filter deals by geography and type in real time solves a lot of friction. How has adoption been since the September launch?",
        "The idea that RE investors overpay for capital just because they do not know what is available is a problem worth solving. How do you keep the lender network growing without sacrificing quality?",
        "From 13 years managing originations to building an award-winning platform -- what is the next big milestone you are pushing toward?",
    ],
}

# ── id:24 Fund My Biz ──
RESEARCH["Fund My Biz"] = {
    "news": [
        n("Continued growth as MCA platform since 2022 launch",
          "FundMyBiz/BBB, 2024",
          "Same-day funding with automatic daily/weekly repayment. Based in Woodmere, NY."),
        n("John Baron DiCanio active in industry networking",
          "LinkedIn, 2024-2025",
          "Prior experience at Direct Merchant Funding, First Premier Funding, Imperial Advance."),
        n("Business in a Box ISO model expansion",
          "LinkedIn/Fund My Biz, 2024",
          "Turnkey platform for ISOs and brokers entering the MCA space."),
    ],
    "icebreakers": [
        "The Business in a Box concept is interesting -- are you seeing first-time brokers enter MCA because of that turnkey approach, or mostly experienced ISOs looking for a new home?",
        "You have deep background -- Direct Merchant Funding, First Premier, Imperial Advance. How has that journey shaped how you built Fund My Biz?",
        "A lot of MCA shops launched around 2022 and have already closed. The fact that Fund My Biz is still growing -- what separates companies that make it?",
        "Same-day funding is harder than it sounds to deliver consistently. What has been the key to making that work operationally?",
    ],
}

# ── id:25 CapFlow Funding Group ──
RESEARCH["CapFlow Funding Group"] = {
    "news": [
        n("Joseph Spiegel wins IFA NEXGEN Rookie of the Year",
          "IFA, 2025",
          "Recognized for rapid impact since joining CapFlow in October 2022."),
        n("Launched FactorOne spot-factoring product",
          "IFA/ABL Advisor, Nov 2025",
          "No-contract, no-minimum: fund a single invoice and get capital in 24-48 hours."),
        n("Active at DeBanked Connect Miami 2025",
          "CapFlow Blog, Feb 2025",
          "Joseph Spiegel representing company, building broker and funder partnerships."),
    ],
    "icebreakers": [
        "Congrats on the NEXGEN Rookie of the Year from the IFA -- real recognition of your impact at CapFlow. What has been the biggest lesson since getting into factoring?",
        "FactorOne is clever -- factor one invoice with no contract or minimums. That removes a lot of friction from traditional factoring. How are you positioning it relative to full facilities?",
        "You had a busy start to 2025 between DeBanked Miami and IFA. What is the pulse of the factoring market right now?",
        "Winning an industry award this early is a strong signal. What is the biggest opportunity you are going after at CapFlow this year?",
    ],
}

# ── id:26 Bridgeport Capital Services ──
RESEARCH["Bridgeport Capital Services"] = {
    "news": [
        n("5 Game-Changing Factoring Trends in 2025 article",
          "BridgeportCapital.com, 2025",
          "Darin McMahon authored analysis on real-time capital delivery and industry-specific factoring."),
        n("AR financing shifts article",
          "BridgeportCapital.com, 2025",
          "Emphasizing transparency, 24/7 data access, and smarter underwriting as differentiators."),
        n("Multi-industry factoring specialization expansion",
          "BridgeportCapital.com, 2024-2025",
          "Deepening in staffing, oilfield, manufacturing, and business services since 1999."),
    ],
    "icebreakers": [
        "Your blog on factoring trends 2025 stood out -- especially AR financing becoming a growth tool not just a lifeline. Are clients shifting that mindset, or does it still take convincing?",
        "Bridgeport has been in factoring since 1999 -- over 25 years. How does that long track record shape underwriting in staffing and oilfield today?",
        "You have written 30+ articles on factoring strategy -- serious market education commitment. What topics generate the most prospect engagement right now?",
        "Industry-specific factoring tailored to billing cycles of staffing versus oilfield versus manufacturing -- how granular do you get with that customization?",
    ],
}

# ── id:27 Fratello Capital ──
RESEARCH["Fratello Capital"] = {
    "news": [
        n("Active ISO partnership program expansion",
          "LinkedIn, 2024-2025",
          "Building out broker network with portal-based platform for merchants."),
        n("Participation in deBanked Miami events",
          "LinkedIn/deBanked, 2024-2025",
          "Connecting with top brokers and expanding relationships in small business funding."),
        n("Continued direct funding operations",
          "Fratello Capital, 2024",
          "Focused as direct capital provider for SMBs."),
    ],
    "icebreakers": [
        "I noticed Fratello has been at deBanked Miami -- those events bring out the most active players. What kind of ISO partnerships have been most productive coming out of conferences?",
        "The portal-based approach for ISOs streamlines deal submission. How has that tech investment changed the volume and quality of deals?",
        "ISO relations can make or break a funding company. What do you think ISOs are looking for most from funder partners right now -- speed, approvals, commissions, or something else?",
        "The MCA space has gotten incredibly competitive. How is Fratello differentiating when an ISO has a dozen funders to choose from?",
    ],
}

# ── id:28 Spring Funding ──
RESEARCH["Spring Funding"] = {
    "news": [
        n("Operating as direct MCA funder with ISO program",
          "SpringFund/FunderIntel, 2024-2025",
          "$5K-$500K funding, approvals in as little as one hour, flexible remittance."),
        n("Competitive commission and rapid approval model",
          "Spring Funding, 2024-2025",
          "Emphasizing reliable commission payouts and rapid approvals to attract ISOs."),
    ],
    "icebreakers": [
        "One-hour approvals and same-day funding is bold -- what does your process look like on the back end to make that speed possible?",
        "As a direct funder competing for ISO attention against well-capitalized players, what is the feedback on why ISOs choose Spring Funding over bigger shops?",
        "The MCA market has seen a lot of new entrants and shakeout. As an owner-operator, what is your read on where the industry is heading?",
        "Reliable commission payouts might sound basic, but every ISO has a horror story about late payments. How important has that reliability been to building your broker network?",
    ],
}

# ── id:29 Biz2Credit ──
RESEARCH["Biz2Credit"] = {
    "news": [
        n("Partners with Columbia University on AI initiative",
          "GlobeNewsWire, Sep 2025",
          "Applying AI to transform SMB loan portfolios into mainstream investable asset class for private credit."),
        n("Named to Deloitte Technology Fast 500",
          "GlobeNewsWire, Dec 2025",
          "203% revenue growth over three years. Seven consecutive years of expansion. $8B+ in SMB financing."),
        n("$33M FTC settlement over PPP processing",
          "FTC/Banking Dive, Mar 2024",
          "Settled charges related to PPP loan processing timeline advertising."),
    ],
    "icebreakers": [
        "Congrats on Deloitte Fast 500 -- 203% growth is a serious track record. How are you channeling that momentum into 2026, especially on Biz2X platform partnerships?",
        "The Columbia University AI partnership is fascinating -- making SMB portfolios investable for private credit. What early traction are you seeing from institutional investors?",
        "With $8B+ funded and seven consecutive years of expansion, Biz2Credit has real scale. What is the biggest opportunity in the SMB lending market that you think is still underserved?",
        "I noticed a lot of thought leadership on small-dollar SBA loans and startup lending. Are you seeing a real shift in demand from early-stage businesses?",
    ],
}

# ── id:30 CFG Merchant Solutions ──
RESEARCH["CFG Merchant Solutions"] = {
    "news": [
        n("Closes $145M credit facility",
          "Yahoo Finance/deBanked, May 2024",
          "$100M senior facility expandable to $145M, plus $30M BBB-rated corporate note."),
        n("Surpasses $2B in total funded capital",
          "CFGMerchantSolutions, 2025",
          "$104M+ funded in Q1 2025 alone with ISO partners."),
        n("Proactively prepares for California SB 362",
          "deBanked, Dec 2025",
          "Full operational readiness, trained all teams, opened direct compliance hotline for ISOs."),
    ],
    "icebreakers": [
        "Crossing $2B in total fundings with $104M in Q1 alone shows real acceleration. Is growth from new ISO partnerships or deeper penetration with existing ones?",
        "Getting ahead of California SB 362 proactively, even opening an ISO compliance hotline -- what made you decide to lead rather than react?",
        "The $145M facility and BBB-rated note are strong capital market signals. How is that institutional backing changing conversations with ISOs and merchants?",
        "With Great Place to Work certification and 92% employee satisfaction, CFG is investing in culture as competitive advantage. How are you retaining top talent in a high-turnover industry?",
    ],
}

# ── id:31 Newity ──
RESEARCH["Newity"] = {
    "news": [
        n("Co-CEOs named to American Banker 25 People Who Will Change Banking",
          "American Banker, Jan 2025",
          "David Cody and Luke LaHaie recognized for streamlining SBA capital access."),
        n("Ranks No. 596 on Inc. 5000 with 695% growth",
          "Inc., Aug 2025",
          "First appearance reflecting explosive growth since 2020 founding."),
        n("Helps Northeast Bank become #1 SBA 7(a) lender by volume",
          "American Banker, 2025",
          "7,800 loans valued at $1.3B in SBA fiscal year 2025."),
    ],
    "icebreakers": [
        "Zero to #1 SBA 7(a) lender by volume in under five years is extraordinary. With 7,800 loans and $1.3B originated, what does the next phase look like?",
        "Congrats on Inc. 5000 at No. 596 -- 695% growth is remarkable. How are you navigating the 2025 SBA SOP changes while maintaining velocity?",
        "Both co-CEOs on American Banker's top 25 changemakers is a strong signal. How are David and Luke thinking about Newity's role as more states add disclosure laws?",
        "Answering 19,000+ member support calls in 2025 shows real service commitment. How important has that human touch been to your growth?",
    ],
}

# ── id:35 Fenix Capital Funding (research calls it "Fenix Capital") ──
RESEARCH["Fenix Capital Funding"] = {
    "news": [
        n("John Bulnes featured on deBanked CONNECT",
          "deBanked",
          "Raising company profile in alternative funding community."),
        n("MCA industry faces expanding state disclosure laws",
          "Multiple sources, 2024-2025",
          "Kansas, Connecticut, Missouri, California SB 362 adding compliance burden to funders."),
    ],
    "icebreakers": [
        "With all the new state disclosure laws -- Kansas, Connecticut, Missouri, California SB 362 -- how is Fenix adapting its compliance infrastructure?",
        "I saw John Bulnes on deBanked CONNECT -- great visibility. How are you thinking about differentiation as competition gets tighter and margins squeeze?",
        "The SBA banning 7(a) loans from refinancing MCA debt could drive more volume to direct funders like Fenix. Are you seeing early impact?",
        "The MCA market is projected to hit $32B by 2032. How is Fenix positioning to capture a bigger slice of that growth?",
    ],
}

# ── id:36 Fox Funding ──
RESEARCH["Fox Funding"] = {
    "news": [
        n("Continues operations since 2012 with expanded digital applications",
          "FoxBusinessFunding, 2024-2025",
          "Founded after 2008 crisis. Thousands of businesses assisted with alternative financing up to $1M."),
        n("MCA industry shifts toward full digital and POS integrations",
          "Industry sources, 2025",
          "Fully digital applications in minutes, POS system integrations for automatic collection."),
    ],
    "icebreakers": [
        "Fox Funding has been in the game since 2012 -- long tenure in alt lending. How has the competitive landscape changed with so many new funders entering?",
        "I am curious how Fox is approaching fully digital underwriting and POS-integrated collections -- building in-house or partnering?",
        "Customer experience seems to be the new battleground in MCA. What is Fox doing differently on servicing compared to five years ago?",
        "The SBA now prohibits 7(a) refinancing of MCA debt, keeping businesses in the MCA ecosystem longer. Is Fox seeing that dynamic play out?",
    ],
}

# ── id:37 800Funding ──
RESEARCH["800Funding"] = {
    "news": [
        n("MCA market projected to reach $32.7B by 2032",
          "Allied Market Research, 2024",
          "Valued at $17.9B in 2023, growing at 7.2% CAGR."),
    ],
    "icebreakers": [
        "The MCA market is on track to nearly double to $32B by 2032. How is 800Funding positioning to capture that growth?",
        "With the MyPillow lawsuits bringing MCA into mainstream news, the industry is getting more public scrutiny. How do you think about reputation management?",
        "The new SBA rule banning MCA refinancing through 7(a) keeps merchants in the ecosystem. Are you seeing that translate into different deal flow?",
        "One in five business funding applicants got denied last year -- a huge underserved market. How does 800Funding think about capturing those borrowers?",
    ],
}

# ── id:38 Lendini ──
RESEARCH["Lendini"] = {
    "news": [
        n("Revenue-based financing provider across all 50 states",
          "UnitedCapitalSource/SuperMoney, 2024-2025",
          "$5.1K to $300K in as little as one business day through Funding Metrics LLC."),
        n("Fintech lenders capture 28% of new SMB originations",
          "Industry sources, 2025",
          "Gaining share against community banks by leveraging real-time data analytics."),
    ],
    "icebreakers": [
        "Fintechs now capture 28% of new SMB originations. Operating in all 50 states, how is Lendini standing out in an increasingly crowded field?",
        "Revenue-based financing is clearly resonating with non-traditional borrowers. What industries are you seeing the strongest demand from?",
        "The CFPB is paying closer attention to alt lending servicing. How is Lendini proactively addressing the borrower experience during repayment?",
        "With the LendTech market projected to hit $145B by 2034, there is massive runway. Is Lendini investing more in tech automation or distribution expansion?",
    ],
}

# ── id:39 Accelerant (research calls it "Accelerant Capital") ──
RESEARCH["Accelerant"] = {
    "news": [
        n("Operates as capital markets advisory firm",
          "Accelerant.capital, 2024-2025",
          "Tailored services helping clients navigate complex financial landscapes in alt funding."),
        n("Banks tightening lending drives alt funding surge",
          "BusinessCapital.com, 2025",
          "Lower bank approval rates creating massive shift toward alternative providers."),
    ],
    "icebreakers": [
        "With banks tightening SMB lending in 2025, alternative funders are seeing a wave. How is Accelerant advising clients on navigating this shift?",
        "The capital markets side of alt lending is evolving fast with more institutional interest in MCA portfolios. What trends in structuring and securitization?",
        "State regulation is reshaping MCA -- California SB 362, NY APR disclosures, SBA MCA ban. How is Accelerant helping clients stay ahead of compliance?",
        "The MCA market projected to hit $32B by 2032 -- as an advisory firm, what is the biggest opportunity you are telling clients to watch?",
    ],
}

# ── id:40 Lendmate ──
RESEARCH["Lendmate"] = {
    "news": [
        n("Bank-focused business funding and capital structuring",
          "LendmateCapital.com, 2024-2025",
          "Helps businesses break free from daily MCA payments by matching with bank solutions."),
        n("Fed rate trajectory creates refinancing opportunities",
          "Multiple sources, 2025",
          "Potential rate cuts making bank borrowing more affordable versus MCA."),
    ],
    "icebreakers": [
        "Lendmate's focus on transitioning businesses from daily MCA payments to bank funding is compelling. How do you approach that conversation with a merchant stuck in the MCA cycle?",
        "A lot of businesses do not realize there is a path from MCA to traditional lending. What does that journey typically look like for a Lendmate client?",
        "With the Fed potentially cutting rates, bank lending becomes more competitive. Are more merchants ready for the transition, or is awareness still the challenge?",
        "The SBA banning MCA refinancing through 7(a) creates a gap. How is Lendmate thinking about alternative pathways for merchants wanting to exit MCA?",
    ],
}

# ── id:41 Stellar Capital ──
RESEARCH["Stellar Capital"] = {
    "news": [
        n("Diversified funding: MCA, invoice financing, CRE",
          "StellarCapSolutions.com, 2024-2025",
          "First position loans $75K-$50M at 6.99%, MCA, invoice financing at 85% advance rates."),
        n("Yellowstone Capital $1B settlement",
          "Industry, Jan 2025",
          "Landmark settlement for rates allegedly over 800% APR sent shockwaves through MCA industry."),
    ],
    "icebreakers": [
        "Stellar's diversification across MCA, invoice financing, and CRE gives multiple revenue streams. How do you decide which product to lead with for a new merchant?",
        "The Yellowstone Capital settlement was a wake-up call for the MCA industry. How is Stellar thinking about compliance and pricing transparency in light of that?",
        "With NY full APR disclosure now in effect, how has that changed Stellar's sales conversations with merchants?",
        "Your team has 50+ years combined experience. In a market where many funders are new, how does that experience translate into better outcomes?",
    ],
}

# ── id:42 Parkview Advance ──
RESEARCH["Parkview Advance"] = {
    "news": [
        n("Multi-product business financing platform from Stamford, CT",
          "ParkviewAdvance.com/BBB, 2024-2025",
          "Founded 2018. LOC, term loans, MCA, equipment financing, ABL through lending partner network."),
        n("Connecticut implements commercial financing disclosure laws",
          "Industry, Jul 2024",
          "New disclosure requirements directly impacting CT-headquartered funders."),
    ],
    "icebreakers": [
        "Being in Connecticut puts you at the center of new commercial financing disclosure laws. Has that been a competitive advantage or compliance headache?",
        "Parkview's model of matching businesses with the right lending partner rather than direct funding is interesting. How do you maintain quality across your network?",
        "With products spanning MCA, equipment financing, and ABL, you have real versatility. What percentage of deal flow starts as one product inquiry but ends up in another?",
        "I see Parkview is actively growing the team. In a competitive hiring market, what attracts people to a Stamford operation versus the bigger NYC shops?",
    ],
}

# ── id:43 Maverick Funding (research calls it "Maverick Payments") ──
RESEARCH["Maverick Funding"] = {
    "news": [
        n("Integrates Visa Acceptance Platform for direct VisaNet processing",
          "PYMNTS/Digital Transactions, Q3 2024",
          "Network tokens, 3D Secure, ML acceptance enhancements for merchants and ISVs."),
        n("White-labeled payment stack for ISVs",
          "Digital Transactions, 2025",
          "Proprietary gateway, ACH, fraud tools, analytics for ISVs to monetize payments."),
        n("Specializes in high-risk merchant processing",
          "MaverickPayments.com, 2024-2025",
          "Accepts businesses most banks reject with experienced underwriting and risk teams."),
    ],
    "icebreakers": [
        "The direct Visa Acceptance Platform integration is a big deal. How has that changed conversations with ISV partners evaluating processors?",
        "The white-label payment stack for ISVs is perfectly timed as more SaaS companies monetize payments. What types of ISVs show the most interest?",
        "Being willing to take high-risk merchants others avoid is a real differentiator. How does your underwriting allow you to serve those verticals profitably?",
        "As a family-owned business since 2000, Maverick has outlasted many processors. What is the key to longevity while balancing entrepreneurial DNA with institutional demands?",
    ],
}

# ── id:33 Rowan Advance (research calls it "Rowan Capital") ──
RESEARCH["Rowan Advance"] = {
    "news": [
        n("ISO-focused MCA with factor rates from 1.28",
          "RowanAdvance.co, 2024-2025",
          "$10K-$5M deals, commissions up to 12 points, same-day approvals, matches competitor offers."),
        n("AI and bank-linking for real-time underwriting",
          "RowanAdvance.co blog, 2025",
          "Plug into verified bank data for real-time evaluation beyond static PDFs."),
        n("$8B+ in asset-based finance at parent level",
          "LinkedIn, 2024-2025",
          "Broader Rowan Capital team brings deep commercial finance experience."),
    ],
    "icebreakers": [
        "Rowan's move to AI and bank-linking for real-time underwriting is smart. What impact on approval and default rates since implementing?",
        "Commissions up to 12 points and same-day payouts is aggressive. How do you balance ISO incentives with healthy margins as rates get competitive?",
        "With $8B in asset-based finance at the corporate level, Rowan brings institutional credibility. Does that help competing for larger $1M-$5M deals?",
        "Matching competitor offers is a bold stance. Does that pricing flexibility come from better capital costs or winning long-term ISO relationships?",
    ],
}

# ── id:32 Thoro Corp ──
RESEARCH["Thoro Corp"] = {
    "news": [
        n("Direct MCA funder backed by $18.8M private investment",
          "ThoroCorp/PitchBook, 2024-2025",
          "Founded 2019 in Florida. Focus on trust, transparency, customized solutions."),
        n("Same-day commissions and early payoff discounts",
          "DailyFunder/ThoroCorp, 2024-2025",
          "No early payoff penalties, Early Payment Discount program differentiator."),
    ],
    "icebreakers": [
        "Thoro's early payoff discount is a differentiator -- most funders want merchants to stay the full term. How does that approach impact renewal rates?",
        "Raising $18.8M from private investors shows confidence. As everyone becomes a direct funder, how is Thoro maintaining its edge?",
        "Same-day commissions for ISOs is strong. How much does commission speed actually influence which funder an ISO chooses versus rate and approval rate?",
        "Founded in 2019 and grew through the pandemic -- a wild time for SMB lending. How did that formative period shape your underwriting philosophy?",
    ],
}

# ── id:34 Bizfund ──
RESEARCH["Bizfund"] = {
    "news": [
        n("Participates in Funders Forum + Brokers Expo 2024",
          "LinkedIn, 2024",
          "Connecting with ISOs, expanding broker relationships. 10 years of MCA experience."),
        n("Expands into Canadian market",
          "BizFund.ca, 2024-2025",
          "Bringing US-based MCA expertise to help Canadian small businesses access working capital."),
    ],
    "icebreakers": [
        "Expanding into Canada is significant -- different regulations and borrower expectations. What has been the biggest surprise adapting the US model for Canadian merchants?",
        "Ten years in MCA gives BizFund real staying power. How are you leveraging that experience to win deals newer funders cannot?",
        "I saw BizFund at the Funders Forum + Brokers Expo. How important is the broker channel versus direct merchant acquisition for your growth?",
        "The banking relationship challenge is real for MCA companies. How is BizFund managing that risk as compliance requirements increase?",
    ],
}


def escape_for_js(s):
    """Escape a string for embedding inside JS double-quoted strings."""
    s = s.replace('\\', '\\\\')
    s = s.replace('"', '\\"')
    # Convert smart quotes / em dashes to safe ASCII
    s = s.replace('\u2019', "'")   # right single quote
    s = s.replace('\u2018', "'")   # left single quote
    s = s.replace('\u201c', '\\"') # left double quote
    s = s.replace('\u201d', '\\"') # right double quote
    s = s.replace('\u2014', '--')  # em dash
    s = s.replace('\u2013', '-')   # en dash
    return s


def build_news_string(news_items):
    """Build the news:[...] JS array string."""
    parts = []
    for item in news_items:
        h = escape_for_js(item["h"])
        s = escape_for_js(item["s"])
        d = escape_for_js(item["d"])
        parts.append('{h:"' + h + '",s:"' + s + '",d:"' + d + '"}')
    return "news:[" + ",".join(parts) + "]"


def build_icebreakers_string(icebreakers):
    """Build the icebreakers:[...] JS array string."""
    escaped = []
    for ib in icebreakers:
        escaped.append('"' + escape_for_js(ib) + '"')
    return "icebreakers:[" + ",".join(escaped) + "]"


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    success_count = 0
    fail_count = 0

    for company_name, data in RESEARCH.items():
        news_str = build_news_string(data["news"])
        icebreakers_str = build_icebreakers_string(data["icebreakers"])

        # Pattern: find the ice:"..." line for this specific company.
        # We search for the company's name in a nearby id:N, name:"..." line,
        # then find its ice:"..." field.
        #
        # Strategy: find `name:"CompanyName"` then look for the next `ice:"..."`
        # and insert news before it + icebreakers after it.

        # Escape the company name for regex
        escaped_name = re.escape(company_name)

        # Match from `name:"CompanyName"` through to the `ice:"..."` line.
        # The ice field may contain escaped quotes, so we match carefully.
        # Pattern: capture everything from name:"X" up to and including the ice:"..." line
        pattern = (
            r'(name:"' + escaped_name + r'".*?)'  # group 1: everything before ice
            r'(\n\s*ice:"(?:[^"\\]|\\.)*")'         # group 2: the ice:"..." line (with newline+indent)
        )

        def replacer(m):
            before_ice = m.group(1)
            ice_line = m.group(2)
            # Extract the indentation from the ice line
            indent_match = re.match(r'\n(\s*)', ice_line)
            indent = indent_match.group(1) if indent_match else "    "
            # Insert news before ice, icebreakers after ice
            result = before_ice + "\n" + indent + news_str + "," + ice_line + ",\n" + indent + icebreakers_str + ","
            return result

        new_content, count = re.subn(pattern, replacer, content, count=1, flags=re.DOTALL)

        if count > 0:
            content = new_content
            print(f"  OK  {company_name}")
            success_count += 1
        else:
            print(f"  FAIL  {company_name} -- pattern not found")
            fail_count += 1

    if content != original:
        with open(INPUT_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\nDone. {success_count} updated, {fail_count} failed.")
    else:
        print("\nNo changes made.")

    # Quick syntax sanity check: balanced braces/brackets
    braces = content.count('{') - content.count('}')
    brackets = content.count('[') - content.count(']')
    parens = content.count('(') - content.count(')')
    if braces == 0 and brackets == 0 and parens == 0:
        print("Syntax check: braces, brackets, parens all balanced.")
    else:
        print(f"WARNING: imbalance detected -- braces:{braces}  brackets:{brackets}  parens:{parens}")

    return fail_count == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
