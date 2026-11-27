export function formatBirthdate(value) {
  if (!value) return "Choose a birthdate";
  const [y,m,d] = value.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"});
}
export function bindBirthdatePicker(root, {onLayout = () => {}} = {}) {
  const find = suffix => root.querySelector(`[data-birthdate="${suffix}"]`);
  const input=find("input"), trigger=find("trigger"), label=find("display"), calendar=find("calendar"), month=find("month-select"), year=find("year-select"), days=find("days"), prev=find("prev"), next=find("next");
  const today = new Date(); today.setHours(0,0,0,0);
  let view = new Date(today.getFullYear(),today.getMonth(),1);
  const controller = new AbortController();
  const listen = (el,type,fn) => el.addEventListener(type,fn,{signal:controller.signal});
  month.replaceChildren(...Array.from({length:12},(_,i)=>new Option(new Date(2000,i,1).toLocaleDateString("en-US",{month:"long"}),i)));
  year.replaceChildren(...Array.from({length:today.getFullYear()-1899},(_,i)=>new Option(today.getFullYear()-i,today.getFullYear()-i)));
  function close(focus=false) { calendar.hidden=true; trigger.setAttribute("aria-expanded","false"); if(focus) trigger.focus({preventScroll:true}); }
  function render() {
    const y=view.getFullYear(), m=view.getMonth();
    month.value=String(m); year.value=String(y);
    prev.disabled=y===1900 && m===0; next.disabled=y===today.getFullYear() && m===today.getMonth();
    for(const option of month.options) option.disabled=y===today.getFullYear() && Number(option.value)>today.getMonth();
    days.replaceChildren();
    for(let i=0;i<new Date(y,m,1).getDay();i++){const spacer=document.createElement("span"); spacer.className="calendar-empty"; days.append(spacer);}
    for(let d=1;d<=new Date(y,m+1,0).getDate();d++){
      const date=new Date(y,m,d), value=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const button=document.createElement("button"); button.type="button"; button.className="calendar-day"; button.textContent=d; button.disabled=date>today;
      button.classList.toggle("selected",input.value===value); button.classList.toggle("today",date.getTime()===today.getTime());
      button.addEventListener("click",()=>{input.value=value; label.textContent=formatBirthdate(value); close(true);}); days.append(button);
    }
    if(!calendar.hidden) onLayout();
  }
  function resetView(){ const [y,m]=input.value.split("-").map(Number); view=new Date(y>=1900 && y<=today.getFullYear()?y:today.getFullYear(),m>=1&&m<=12?m-1:today.getMonth(),1); if(view>today)view=new Date(today.getFullYear(),today.getMonth(),1); render(); }
  listen(trigger,"click",()=>{if(!calendar.hidden){close();return;} calendar.hidden=false; trigger.setAttribute("aria-expanded","true"); resetView();});
  listen(month,"change",()=>{view=new Date(view.getFullYear(),Number(month.value),1);render();});
  listen(year,"change",()=>{const y=Number(year.value);view=new Date(y,y===today.getFullYear()?Math.min(view.getMonth(),today.getMonth()):view.getMonth(),1);render();});
  listen(prev,"click",()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render();});
  listen(next,"click",()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();});
  listen(find("clear"),"click",()=>{input.value="";label.textContent=formatBirthdate("");close(true);});
  listen(find("today"),"click",()=>{view=new Date(today.getFullYear(),today.getMonth(),1);render();});
  listen(document,"pointerdown",event=>{if(!calendar.hidden&&!calendar.contains(event.target)&&!trigger.contains(event.target))close();});
  listen(document,"keydown",event=>{if(event.key==="Escape"&&!calendar.hidden){event.preventDefault();event.stopPropagation();close(true);}});
  resetView();
  return {reset(){close();resetView();},destroy(){controller.abort();}};
}
