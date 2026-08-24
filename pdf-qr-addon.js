(function(){
  const QR_DATA='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXIAAAFyAQAAAADAX2ykAAACgklEQVR4nO2bTW6dMBRGzy1IGRopCzJb2C1skj1BnqA36A10Br1B3iCrsEvYB3CEdsEeIPu9S1jbMSQSSHFoiMOWvqbki6deAf+KeN5lwm9H8d7x0QghhBBCSLnF/0JX2ZpnmIHvP8AEnQBtvRG83+8+7t4f6yyfZ8JFQ31P32Brr7O7Tb98hq1N5uSzr1zEzUs8hY0b9bGNmzGTS6Pl5B8V8h6kAfu0rNhAS5yik5RT0RTlVJywLPB/E3FD/tbJPlh8j/8P79zvPg4RRE1kXaQiSs6OXcfRUTJ81iVIemESQ2HbyVnIuyVMc/Nk00o4si8B5rKx7RQ80XmXpUlLreR0I4vSrO9Slpby3MT0X6zvbteTgt9vI6l7+Y6w/gP7XxMNIyLV8T0f2LvX1/WTdFT57RmR9y5UOwjLJ7iyfa4qjyg//4WD2ruNruKMpyfne6MU5QZ5X/QUecLCfOTNsNmwvdlxKDT/DZILc/i9q5Fm8cbPaVIFc/f8yqh8RvcGTVk8fmrktbzdc2AxqVb4HkTziGSMloei8xoW6lbT6KdAZnXJwFSOHmyCLB/S9F7+OzNbRGITcsBVJhyoGD/dZP2pdbnqz6vX2WNU4tJrt0eu23KELrPmYyKOR40UPthFb5C1kz0cCZVHR53z19oP1uXNyMrK/rupmsdtfEpYHm31lLY0cZbXTtWYM8OHKDqz6GC2c3WZsbMbKsc3qeKs7LsZ8BJ3jR4HvhMaH1Gyv7MyCk1UuVz+kRGfutg7lFIBTgH+CRRSFe1YckmnNDMPDnwmpzRYL0JPCZKEPJ8NXF1uRkMgzYjkgpiwZ7l8fKtc+E9I4ePuPPgOEcgDTBpeEOi4pMDexb3a4bGc0by4ve+uzayxkx7Y90w/zsD6fCCGEEEII/ZP+AfQwtBA1iVqNAAAAAElFTkSuQmCC';
  function patch(){
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF||!jsPDF.API||jsPDF.API.__opeiticaQrPatched)return false;
    const original=jsPDF.API.output;
    if(typeof original!=='function')return false;
    jsPDF.API.output=function(){
      try{
        if(!this.__opeiticaQrAdded){
          if(window.OPEITICA_LOGO_DATA){
            try{this.addImage(window.OPEITICA_LOGO_DATA,'JPEG',176,3,17,17,undefined,'FAST');}catch(e){console.warn('Logo PDF:',e);}
          }
          this.addImage(QR_DATA,'PNG',166,55,24,24,undefined,'FAST');
          this.setTextColor(45,45,45);
          this.setFont('helvetica','bold');
          this.setFontSize(7.5);
          this.text('ESCANEIE E FALE',178,82,{align:'center'});
          this.text('CONOSCO NO WHATSAPP',178,86,{align:'center'});
          this.__opeiticaQrAdded=true;
        }
      }catch(e){console.warn('Complementos PDF:',e);}
      return original.apply(this,arguments);
    };
    jsPDF.API.__opeiticaQrPatched=true;
    return true;
  }
  if(!patch()){
    const timer=setInterval(()=>{if(patch())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();