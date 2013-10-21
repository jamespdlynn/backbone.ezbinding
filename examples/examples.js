function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateURL(url) {
    var re = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return re.test(url);
}

var ModelView = Backbone.View.extend({
    el : '#modelView',

    modelBindings : {
        //One way bindings
        '.full-name' : '{firstName} {lastName}',
        'a.email' : '{email}',
        '[href] a.email' : 'mailto:{email}',
        'span.job' : '{job}',
        '[visible] #user' : '{enabled}',

        //Two way bindings
        '[keyup@value] input.first-name' : '{firstName}',
        '[keyup@value] input.last-name' : '{lastName}',
        '[@value] input.email' : '{email}',
        '[@value] select.job' : '{job}',
        '[@checked] input.enabled' : '{enabled}'
    },

    events : {
        'change input.email' : 'onEmailChange'
    },

    onEmailChange: function(evt) {
        var newValue =  $(evt.target).val();
        //Check if valid email address
        if (!validateEmail(newValue)){
            evt.stopImmediatePropagation(); //Prevent model property from updating
            this.renderBindings(); //Reset input value
        }
    }

});

var CollectionView = Backbone.View.extend({
    el : '#collectionView',

    modelBindings : {
        //Specific Model Bindings
        '[href] a#first-link' : '[0]{url}',
        '[href] a#aristobot-link' : '[aristobot]{url}',

        //Recursive One way Model Bindings
        'ul.links > li' : {
            '[data-id]' : '{id}',
            'a.link' : '{url}',
            '[href] a.link' : '{url}'
        },

        //Recursive Two way Model Bindings
        'ul.edit-links > li' : {
            '[data-id]' : '{id}',
            '[disabled] input.link' : '!{editable}',
            '[@value] input.link' : '{url}'
        }
    },

    events : {
        'change input.link' : 'onURLChange',
        'click #shuffle' : 'onShuffleClick'
    },

    onURLChange: function(evt) {
        var newValue =  $(evt.target).val();
        //Check if valid URL
        if (!validateURL(newValue)){
            evt.stopImmediatePropagation(); //Prevent model property from updating
            this.renderBindings(); //Reset input value
        }
    },

    onShuffleClick : function(){
        //Shuffle the models then reattach the bindings
        this.collection.models = _.shuffle(this.collection.models);
        this.attachBindings();
    }
});

//Create and Render new Model View
new ModelView({
    model :new Backbone.Model({
        firstName : "Joe",
        lastName : "Smith",
        job : 'Programmer',
        email : "joe.smith@inter.net",
        enabled : true
    })
}).render();

//Create and Render Collection View
new CollectionView({
    collection : new Backbone.Collection([
        {id : 'google', url : 'http://google.com', editable : true},
        {id : 'aristobot', url : 'http://aristobotgames.com', editable : false},
        {id : 'wikipedia', url : 'http://wikipedia.com', editable : true},
        {id : 'github', url : 'https://github.com', editable : true}
    ])
}).render();
