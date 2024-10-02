'use strict';

/* global $ Chart */

$(document).ready(function() {
  // get year from url query to apply to all backend requests
  const urlQuery = window.location.search
    .slice(1) // remove leading '?'
    .split('&') // split params
    .reduce((result, kv) => { // make an object of key value pairs
      const [key, value] = kv.split('=');
      return Object.assign(result, { [key]: value });
    }, {});

    const yearParam = urlQuery.year ? `?year=${urlQuery.year}` : '';

  // pie chart stats
  const COLORS = {
    'Geographie': 'orange',
    'Geoinformatik': 'cornflowerblue', // uuuuh
    'Landschaftsökologie': 'mediumseagreen',
    'Zwei-Fach-Bachelor': 'gold',

    'female': 'orange',
    'male': 'gold',
    'other': 'grey',

    'fleischig': 'darkred',
    'vegan': 'olive',
    'vegetarisch': 'yellowgreen',

    'alcoholic': 'red',
    'non-alcoholic': 'grey',
  };

  function getColors (stats) {
    return stats.map(s => COLORS[s.field]);
  }

  ['gender', 'study', 'food', 'drinks'].forEach(function(aspect) {
    $.get(`${BASE_URL}/api/statistics/${aspect}${yearParam}`, function(stats, status) {
      if (status !== 'success') return console.error(stats, 'error');

      var canvas = document.getElementById("chart-"+aspect);
      var options = {
        type: 'pie',
        data: {
          labels: stats.map(s => s.field),
          datasets: [{
            data: stats.map(s => s.count),
            backgroundColor: getColors(stats),
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          maintainAspectRation: false
        }
      };
      new Chart(canvas, options);
    });
  });
});
