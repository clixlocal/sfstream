var socket, postTemplate, postContainer, filter = {};

var hospitalMap = {
  sbmc : 'Saint Barnabas Medical Center',
  mmc  : 'Monmouth Medical Center',
  nbi  : 'Newark Beth Israel Medical Center',
  cmmc : 'Clara Maass Medical Center',
  cmc  : 'Community Medical Center',
  kmc  : 'Kimball Medical Center'
};

$(function(){
  socket = io.connect('ws://salesforce-mattdiamond.rhcloud.com:8000/');
  //socket = io.connect();

  var path = window.location.pathname.toLowerCase(),
      acronym = path.slice(1);

  if (acronym && hospitalMap[acronym]){
    filter.hospital = hospitalMap[acronym];
    $('.hospital-filters [href="'+path+'"]').parent().addClass('active');
  }

  socket.on('posts', function(posts){
    renderPosts(posts);
  });

  socket.on('error', function(err){
    console.error(err);
  });

  socket.on('authenticated', function () {
    socket.emit('getPosts', filter);
    socket.emit('getTrending', filter.hospital, initTrendingFilter);
  });

  postTemplate = $('.post.template');
  postContainer = $('#StreamContainer .posts');

  $('.sentiment-filters button').click(changeSentimentFilter);

  $('#FilterMenu').on('click', '.value', function(){
    var $this = $(this);
    if ($this.hasClass('selected')){
      $this.removeClass('selected');
    } else {
      $this.addClass('selected');
      if (!$this.closest('.field-filter').hasClass('multi')){
        $this.siblings().removeClass('selected');
      }
    }
    var $field = $(this).closest('.field-filter');
    updateFilterField($field);
    clearPosts();
    socket.emit('getPosts', filter);
  });

  $('.clear-filter').on('click', function(){
    var $filter = $(this).closest('.field-filter');
    $('.value.selected', $filter).removeClass('selected');
    var field = $filter.data('field');
    delete filter[field];
    clearPosts();
    socket.emit('getPosts', filter);
  });
});

function clearPosts(){
  postContainer.empty();
  $('.loading').show();
}

function renderPosts(posts){
  $('.loading').hide();
  $.each(posts, function(){
    var $post = postTemplate.clone();
//    if (this.Author__r){
//      $('.author-name', $post).text(this.Author__r.Name);
//    }
    var content = processContent(this.Content__c);
    $('.content', $post).text(content);
    var date = new Date(this.Publish_Date__c);
    $('.time-published', $post).text(date.toLocaleString());
    $('.post-title', $post).text(this.Name).attr('href', this.Url__c);
    if (this.Author__r){
      $('.post-image', $post).attr('src', this.Author__r.Picture_URL__c);
    }
    $post.addClass('sentiment-' + this.Sentiment__c.toLowerCase());
    $post.appendTo(postContainer).slideDown();
  });
}

function processContent(content){
  content = strip(content);
  return content.length > 140 ? content.slice(0, 137) + '...' : content;
  //return content.replace(/http:\S+/, "<a href='$&' target='_blank'>$&</a>");
}

function changeSentimentFilter(){
  $this = $(this);

  if ($this.hasClass('active')){
    $this.removeClass('active');
  } else {
    $this.siblings().removeClass('active');
    $this.addClass('active');
  }

  var sentiment = [];
  $('.sentiment-filters .active').each(function(){
    sentiment.push($(this).data('sentiment'));
  });

  filter.sentiment = sentiment;

  clearPosts();
  socket.emit('getPosts', filter);
}

var filters = {
  Influencer : 'Influencer__c'
};

function initFilters(fields){
  $('.field-filter').each(function(){
    var field = $(this).data('field'),
        $vals = $(this).find('.values');

    var values = fields[field].picklistValues;
    $.each(values, function(i, val){
      var filter = $('<div>')
                      .addClass('value')
                      .data('value', val.value)
                      .text(val.label);

      $vals.append(filter);
    });
  });

  $('#FilterMenu').on('click', '.value', function(){
    $(this).toggleClass('selected');
    var $field = $(this).closest('.field-filter');
    updateFilterField($field);
    clearPosts();
    socket.emit('getPosts', filter);
  });

  $('#FilterMenu').fadeIn();
}

function updateFilterField($field){
  var field = $field.data('field');
  var selected = [];
  $field.find('.values .selected').each(function(){
    selected.push($(this).data('value'));
  });
  filter[field] = selected;
}

function initTrendingFilter(trending){
  var topics = trending.topics,
      keywords = trending.keywords,
      topicFilter = $('.topic-filter'),
      keywordFilter = $('.keyword-filter');

  if (!topics){
    topicFilter.hide();
  } else {
    topics = topics.slice(0, 5);
    loadFilter(topicFilter, topics);
  }

  if (!keywords){
    keywordFilter.hide();
  } else {
    keywords = keywords.slice(0, 5);
    loadFilter(keywordFilter, keywords);
  }
}

function loadFilter(context, objects){
  var $filters = $('.values', context);
  $filters.empty();
  $.each(objects, function(i, obj){
    var $filter = $('<div>')
                    .addClass('value')
                    .data('value', obj.name)
                    .text(obj.name);

    $filters.append($filter);
  });
}

function strip(html){
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}