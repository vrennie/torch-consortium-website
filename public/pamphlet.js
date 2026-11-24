document.querySelectorAll('[data-book]').forEach(book=>{
 const slides=[...book.querySelectorAll('[data-slide]')],nums=[...book.querySelectorAll('[data-page]')];
 let i=0,z=1;const zooms=[1,1.5,2,3];const find=s=>book.querySelector(s);
 function render(){
  slides.forEach((slide,k)=>{
   slide.hidden=k!==i;
   if(k===i){const img=slide.querySelector('img');img.style.width=(z*100)+'%';img.style.maxWidth=z===1?'100%':'none';find('[data-original]').href=img.src;}
  });
  nums.forEach((b,k)=>k===i?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  find('[data-counter]').textContent='Page '+(i+1)+' / '+slides.length;
  find('[data-zoom]').textContent=(z*100)+'%';
  slides[i].querySelector('.book-image').scrollTo(0,0);
  find('[data-previous]').disabled=i===0;find('[data-next]').disabled=i===slides.length-1;
  find('[data-out]').disabled=z===1;find('[data-in]').disabled=z===3;
 }
 function go(n){i=Math.max(0,Math.min(slides.length-1,n));z=1;render();}
 find('[data-previous]').addEventListener('click',()=>go(i-1));
 find('[data-next]').addEventListener('click',()=>go(i+1));
 nums.forEach((b,n)=>b.addEventListener('click',()=>go(n)));
 find('[data-in]').addEventListener('click',()=>{z=zooms[Math.min(3,zooms.indexOf(z)+1)];render();});
 find('[data-out]').addEventListener('click',()=>{z=zooms[Math.max(0,zooms.indexOf(z)-1)];render();});
 find('[data-fit]').addEventListener('click',()=>{z=1;render();});
 book.addEventListener('keydown',e=>{if(e.target!==book)return;if(e.key==='ArrowRight'){e.preventDefault();go(i+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(i-1);}});
 render();
});