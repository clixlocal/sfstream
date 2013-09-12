var socket, postTemplate, postContainer, filter = {};

$(function(){
  socket = io.connect();

  socket.on('posts', function(posts){
    renderPosts(posts);
  });

  socket.on('authenticated', function () {
    socket.emit('getPosts');
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