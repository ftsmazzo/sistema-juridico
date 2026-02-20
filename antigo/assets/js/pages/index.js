var timer;

$(document).ready(function(){
  monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

  var cTime = new Date(), month = cTime.getMonth()+1, year = cTime.getFullYear();

  var events = [
      {
        "date": "4/"+month+"/"+year, 
        "title": 'Meet a friend', 
        "link": 'javascript:;', 
        "color": 'rgba(255,255,255,0.2)', 
        "content": 'Contents here'
      },
      {
        "date": "7/"+month+"/"+year, 
        "title": 'Kick off meeting!', 
        "link": 'javascript:;', 
        "color": 'rgba(255,255,255,0.2)', 
        "content": 'Have a kick off meeting with .inc company'
      },
      {
        "date": "19/"+month+"/"+year, 
        "title": 'Link to Google', 
        "link": 'http://www.google.com', 
        "color": 'rgba(255,255,255,0.2)', 
      }
    ];

    $('.calendar-box2').bic_calendar({
        events: events,
        dayNames: dayNames,
        monthNames: monthNames,
        showDays: true,
        displayMonthController: false,
        displayYearController: false,
        popoverOptions:{
            placement: 'top',
            trigger: 'hover',
            html: true
        },
        tooltipOptions:{
            placement: 'top',
            html: true
        }
    });
});