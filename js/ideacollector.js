// An example Backbone application
// uses backbone-localstorage by JGN (http://jgn.me/)
// to persist Backbone models within your browser.


// Current question view
// ---------------------
// The view associated witht the div DOM element of the question
// currently being asked.
App.CurrentQuestionView = Backbone.View.extend({

    // What element am I associated with?
    el: "div#current-question",

    // Cache the template function for a single item.
    template: _.template($('#current-question-template').html()),

    // The DOM events specific to an item.
    events: {
      "keypress #new-response"  : "updateOnEnter",
    },

    initialize: function(options) {
        this.prompt = options.prompt;
        this.nextquestions = options.list_of_questions;         // the array of questions to ask. nextQuestion iterates over this

        // timer
        this.TIME_TO_ANSWER = 40;
        this.time_left = 0;
        this.timer = undefined;

        // next question logic
        this.questionIndex = undefined;
        App.on("Qanswered", function() {
            console.log("Triggered next while questionIndex is " + this.questionIndex);
            this.nextQuestion();
        }, this);

    },
    destroy: function() {
        this.remove();              //Remove view from DOM
        this.unbind();              //Remove backbone events
    },

    render: function() {
      this.$el.html(this.template({prompt:this.prompt, response:"Enter ur answer here"}));
      this.$("input").focus();
      // console.log("rendered ...");
      this.startTimer();
    },


    nextQuestion: function() {

        //update counter
        if(typeof this.questionIndex === "undefined")
            this.questionIndex = 0;
        else {
            this.questionIndex++;
        }

        // setup the question prompt and render
        if (this.questionIndex < this.nextquestions.length ){
            this.prompt = this.nextquestions[this.questionIndex];
            this.render();
        } else {
            //kill the view
            this.destroy();
        };

    },



    // timer functions
    updateTimer: function() {
        // console.log(this.time_left );
        this.$("#timer").html(this.time_left);
        this.time_left = this.time_left -1;
        if (this.time_left === 0){
            console.log( "Timer expired...");
            this.$("#timer").html("");
            clearInterval( this.timer );
            this.createQuestion();
        };

    },
    startTimer: function() {
        // console.log("Timer started");
        this.time_left = this.TIME_TO_ANSWER; 
        clearInterval( this.timer );
        this.timer = setInterval(_.bind(this.updateTimer, this),1000);
        this.updateTimer();
    },


    // Save on enter
    updateOnEnter: function(e) {
        //console.log( "updating... "); 

        if (e.keyCode != 13) return;      //only work on enter
        if ( !this.$("input").val() ) return;    //only if non empty

        console.log("creating on enter ... ");
        this.createQuestion();
    },



    createQuestion: function(){
      //console.log( this.$("input").val()  );
      console.log(" createQUestion says hi");
      console.log( this.pompt );
      console.log( this.$("input").val()  );
      App.questions.create({prompt:this.prompt, response: this.$("input").val()} );

      App.trigger("Qanswered");
    },

  });








// Question Model
// ----------

// The **Question** model has `prompt`, `response`, `order` and `use` attributes.
App.Question = Backbone.Model.extend({

    // Default attributes for the question item.
    defaults: function() {
      return {
        prompt: "this is where the question would be",
        response: "enter your answer here...",
        order: App.questions.nextOrder()
      };
    }
    
    
    /*
    // Ensure that each question created has `response`.
    initialize: function() {
      if (!this.get("response")) {
        this.set({"response": this.defaults().response});
      }
    },
    */

});
  
  
  


// Question Collection
// -------------------

// The collection of question is backed by *localStorage*
App.QuestionsList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: App.Question,

    // Save all of the question items under the `"todos-backbone"` namespace.
    localStorage: new Backbone.LocalStorage("ideacollector-dev3"),


    // We keep the Questions in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Questions are sorted by their original insertion order.
    comparator: function(question) {
      return -1*question.get('order');
    }

  });

  

// Question Item View
// ------------------

// The DOM element for a todo item...
App.QuestionView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#question-template').html()),

    // The DOM events specific to an item.
    events: {
      "dblclick .view"  : "edit",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a **Questions** and a **QuestionsView** in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    // Re-render the titles of the todo item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      //console.log( this.model.toJSON());
      this.input = this.$('response input');

      return this;
    },


    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
        var value = this.$("input").val();
        this.model.save({response: value});
        this.$el.removeClass("editing");
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove the item, destroy the model.
    destroy: function() {
      this.model.destroy();
    }

  });
  
  
  
  
// The QuestionsList view 
// ----------------------
App.QuestionsView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#ideacollectorapp"),

    events: {
        "click #clear-completed":   "destroyAll",
        "click #save-as":           "exportAsTex"
    },

    // At initialization we bind to the relevant events on the `Questions`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved in *localStorage*.
    initialize: function() {

      this.listenTo(App.questions, 'add', this.addOne);
      this.listenTo(App.questions, 'reset', this.addAll);
      this.listenTo(App.questions, 'all', this.render);


      //var view = new QuestionView({model: question});
      //this.$("#questions-list").prepend(view.render().el);
      this.footer = this.$('footer');
      this.main = $('#main');

      App.questions.fetch();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      
      if (App.questions.length) {
        this.main.show();
        this.footer.show();
      } else {
        //this.main.hide();
        this.footer.hide();
      }

    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(question) {
      var view = new App.QuestionView({model: question});
      this.$("#questions-list").prepend(view.render().el);
    },

    // Add all items in the **Questions** collection at once.
    addAll: function() {
      App.questions.sort().each(this.addOne, this);
    },

    //Clear the list
    destroyAll: function(event) {
        event.preventDefault();
        for (var i = App.questions.length - 1; i >= 0; i--) { 
            App.questions.at(i).destroy(); 
        } 
            
    },
    
    exportAsTex: function (event) {
        var doc = "";
        doc += "\\documentclass[10pt]{article}\n";
        doc += "\\title{A business idea}\n"
        doc += "\\begin{document}\n\\maketitle\n\n";
        App.questions.forEach( function (model) {
            doc += "\\subsection*{";
            doc += model.get("prompt");
            doc += "}\n";
            doc += model.get("response");
            doc += "\n\n";
        });
        doc += "\\end{document}\n\n";

        //save as 
        var blob = new Blob([doc], {type: "application/x-tex;charset=utf-8"});
        saveAs(blob, "idea.tex");

    }



  });

  
  
  



