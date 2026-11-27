// Public content only. Do not put private officer information or credentials here.
// Add approved partner names and local logo filenames; no API or database needed.
export const partners = [
  { name: 'DataCamp Donates', logo: 'public/assets/partners/DC_Donates_logo_inverted.png' },
];
// Only set this to a deliberately public endpoint that returns published names,
// offices, positions and public portrait URLs, never administrative records.
export const publicOfficersUrl = null;
// Optional approved public roster, used only if a live public roster is unavailable.
export const officers = [
  // { name: 'Full name', office: 'Office', position: 'Position', image: '/assets/officers/portrait.jpg' },
];
export const sampleEvents = [
  {title:'Cloud Foundations Workshop',date:'2027-01-23',time:'9:00 AM – 12:00 PM',location:'Colegio de Muntinlupa',description:'An introductory hands-on session exploring cloud fundamentals.',sample:true,theme:0},
  {title:'Build Together: Mini Project Lab',date:'2027-02-13',location:'Colegio de Muntinlupa',description:'A collaborative project-building session for student developers.',sample:true,theme:1},
  {title:'Community Kickoff',date:'2026-09-05',time:'1:00 PM – 4:00 PM',location:'Colegio de Muntinlupa',description:'A community introduction and opportunity to meet fellow builders.',sample:true,theme:2},
];

// Only shown in the opt-in ?preview=1 design preview, never as a real roster.
export const previewOfficers = [
 {name:'Sample Officer One',office:'Executive Office',position:'Student Builder Group Lead',image:'/assets/public-design/portrait-1.svg'},
 {name:'Sample Officer Two',office:'Executive Office',position:'Executive Director',image:'/assets/public-design/portrait-2.svg'},
 {name:'Sample Officer Three',office:'Technical Office',position:'Technical Director',image:'/assets/public-design/portrait-3.svg'},
 {name:'Sample Officer Four',office:'Technical Office',position:'Projects Coordinator',image:'/assets/public-design/portrait-4.svg'},
];
export const previewPartners = [
 {name:'Sample cloud community',logo:'/assets/public-design/partner-cloud.svg'},
 {name:'Sample makers community',logo:'/assets/public-design/partner-makers.svg'},
 {name:'Sample technology community',logo:'/assets/public-design/partner-tech.svg'},
];
