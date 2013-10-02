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
  //socket = io.connect('ws://salesforce-mattdiamond.rhcloud.com:8000/');
  socket = io.connect();

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
    socket.emit('getFields', function(fields){
      console.log(fields);
    });
  });

  postTemplate = $('.post.template');
  postContainer = $('#StreamContainer .posts');

  $('.sentiment-filters button').click(changeSentimentFilter);
});

function clearPosts(){
  postContainer.empty();
  $('.loading').show();
}

function renderPosts(posts){
  $('.loading').hide();
  $.each(posts, function(){
    var $post = postTemplate.clone();
    if (this.Author__r){
      $('.author-name', $post).text(this.Author__r.Name);
    }
    var content = processContent(this.Content__c);
    $('.content', $post).html(content);
    var date = new Date(this.Publish_Date__c);
    $('.time-published', $post).text(date.toLocaleString());
    $post.addClass('sentiment-' + this.Sentiment__c.toLowerCase());
    $post.appendTo(postContainer).slideDown();
  });
}

function processContent(content){
  return content.replace(/http:\S+/, "<a href='$&' target='_blank'>$&</a>");
}

function changeSentimentFilter(){
  $this = $(this);
  $this.toggleClass('active');

  var sentiment = [];
  $('.sentiment-filters .active').each(function(){
    sentiment.push($(this).data('sentiment'));
  });

  filter.sentiment = sentiment;

  clearPosts();
  socket.emit('getPosts', filter);
}