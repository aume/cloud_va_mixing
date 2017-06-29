
"use strict"

function WordCloudSearch() {
  this.selectedCategory = '' ;
  this.categoryWords = {};
  this.query = {}
}

WordCloudSearch.prototype.loadWords = function() {
  let taxonomy = db.exec("SELECT * FROM taxonomy_wordlist");
  //console.log(taxonomy[0]['values']) ;

  let frequencies = taxonomy[0]['values'].map(function(obj){
      return  parseInt(obj[2]);
  });
  let minVal = Math.min.apply(null, frequencies) ;
  let maxVal = Math.max.apply(null, frequencies) ;

  for (var i = 0; i < taxonomy[0]['values'].length; i++) {
      let obj=taxonomy[0]['values'][i]
      obj[2] = 0.25+(parseInt(obj[2])-minVal)/(maxVal-minVal)
  }

  let words = taxonomy[0]['values'].map(function(obj){
      return {'text':obj[1], 'wordid':obj[0], 'size':75*obj[2]}
  }) ;

  //console.log(words);
  
  this.makeTaxCloud(words);
}

WordCloudSearch.prototype.makeTaxCloud = function (words) {
    var fill = d3.scale.category20();

    let container = document.getElementById('words_container');
    var width = 500;
    var height = width;


    d3.layout.cloud()
      .size([width, height])
      .words(words)
      .padding(1)
      .rotate(function() { return 0; }) //(~~(Math.random() * 6) - 3) * 30
      .font("Impact")
      .fontSize(function(d) { return d.size;})
      .on("end", draw)
      .start();

    var makeSelection = function (d) {
      this.selectedCategory = d ;
      this.categoryWords = {};

      // get all the words associated with the files in this category
      var tquery = 'SELECT DISTINCT word, wordlist.wordid \
      FROM wordlist, filewords, taxonomy_filewords, taxonomy_wordlist \
      WHERE wordlist.wordid = filewords.wordid \
      AND filewords.fileid = taxonomy_filewords.fileid \
      AND taxonomy_filewords.wordid = taxonomy_wordlist.cat_id \
      AND taxonomy_wordlist.category = "'+d.text+'"'
      var taxonomy = db.exec(tquery);

      // var list="<ul>" ;
      // taxonomy[0]['values'].forEach(function(obj){
      //     this.categoryWords[obj[0]] = obj[1] ;
      //     list+="<li onclick='searcher.registerSelection(this.innerHTML)'>"+obj[0]+"</li>";
      // }.bind(this)) ;
      // list += "</ul>" ;

      // document.getElementById('stuff').innerHTML = list ;

      var container = document.getElementById('words') ;
      if (container.hasChildNodes()) {
          container.removeChild(container.lastChild);
      }


      var list = document.createElement("ul");
      container.appendChild(list) ;
      
      var obj = taxonomy[0]['values'] ;
      for (var i = 0; i < obj.length; i++) {
          this.categoryWords[obj[i][0]] = obj[i][1] ;
          var newLi = document.createElement("li");
          newLi.innerHTML = obj[i][0];
          list.appendChild(newLi);

          (function(value){
            newLi.addEventListener("click", function() {
               this.registerSelection(value) ;
            }.bind(this), false);}.bind(this))(obj[i][0]);
      }

        document.getElementById('category').innerHTML = this.selectedCategory.text ;
    }.bind(this) ;


    function draw(words) {
        d3.select("#cloud")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("border-style", 'solid')
          //.style("float", "right")
          .append("g")
          .attr("transform", "translate("+ width/2 +","+ height/2 +")")
          .selectAll("text")
          .data(words)
          .enter()
          .append("text")
          .style("font-size", function(d) { return d.size + "px"; })
          .style("font-family", "Impact")
          .style("opacity", ".7")
          .style("color", "grey")
          .style("fill", function(d, i) { return fill(i); })
          .attr("text-anchor", "middle")
          .attr("transform", function(d) {
              return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; 
          })
          .text(function(d) { return d.text; })
          .on("click", function (d, i){
            // query.push(d['text']) ;
            // console.log(query);
            
            
            
            makeSelection(d);

            // post the cateogry we are drilling into
            
            

              //window.open(d.url, "_blank");
          })
          .on("mouseover", function(d,i){
                d3.select(this).style({
                  "font-size": '45px',
                  "opacity":'1'
                });

          })
          .on("mouseout", function(d,i){
            d3.select(this).style({
                  "font-size": d.size + "px"
                });
          });
    } // end draw
} // end make cloud


// call back from list word selection
WordCloudSearch.prototype.registerSelection = function(e) {
      // console.log('word', e);
      // console.log('selectedCategory', this.selectedCategory) ;
      // console.log('categoryWords', this.categoryWords);

    var fileids = this.getFileIDs(this.selectedCategory.wordid, this.categoryWords[e])
    // console.log('fileids', fileids)

    if(this.selectedCategory.text in this.query) {

        // filter the results for doubles in other word results
        fileids = fileids.filter(function(obj){
            var item = true ;
            this.query[this.selectedCategory.text]['words'].forEach(function(obj2){
                if(obj2['files'].includes(obj)) item = false ;
            }.bind(this)) ;
            return item ;
        }.bind(this)) ;
        if(fileids.length == 0) return;
        // add it to the list
        this.query[this.selectedCategory.text]['words'].push({
                'word':e,
                'files':fileids
            }) ;
    } 
    else {
        this.query[this.selectedCategory.text] = {
            'id':this.selectedCategory.wordid, 
            'words':[{
                'word':e,
                'files':fileids
            }]
        } ;
    }
    // console.log('query', this.query) ;
    var show = "" ;
    for(let key in this.query) {
        this.query[key]['words'].forEach(function(obj){
            //show += "<li>" ;
            show += key + ": "
            show += obj['word'] ;
            show += ", " ;
        }) ;
        
    }
    show += "</ul>"
    document.getElementById('query').innerHTML = show ;
}


// get the file ids for category/word combo
WordCloudSearch.prototype.getFileIDs = function(cat, wordid) {
  // console.log(cat, wordid)
    var tquery = 
        'SELECT filewords.fileid \
        FROM filewords\
        INNER JOIN taxonomy_filewords ON filewords.fileid = taxonomy_filewords.fileid\
        WHERE filewords.wordid = '+wordid+'\
        AND taxonomy_filewords.wordid = '+cat ;
    var taxonomy = db.exec(tquery);
    return taxonomy[0]['values'].map(function(obj){return obj[0]});
}


// getter method
WordCloudSearch.prototype.getFormattedQuery = function() {

  let value = []
  for(let key in this.query) {
    for(let i in this.query[key]['words']) {
      value.push(this.query[key]['words'][i]) ;
    }
  }
  return value ;
}
