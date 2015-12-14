function make_slides(f) {
  var slides = {};

  slides.i0 = slide({
     name : "i0",
     start: function() {
      exp.startT = Date.now();
      $(".total-num").html(exp.numTrials);  
     }
  });

  slides.instructions = slide({
    name : "instructions",
     start: function() {
      _.mapObject(exp.judgeButtons, function(val,key){
        $("#"+key).html(val);
      });
      $(".total-num").html(exp.numTrials);  
    },
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.truthJudge = slide({
    name: "truthJudge",
    present : exp.stims,
    //this gets run only at the beginning of the block
    present_handle : function(stim) {
      // debugger;
      this.startTime = Date.now();

      this.stim = stim 
      var habit = this.stim[0]
      var charName = this.stim[1]

      var freq = _.omit(habit, "habitual")

      this.stim.freq = "3"
      var description = habit.condition
      this.stim.description = description

      var keyDictionary = {
        "agree-key": "Agree",
        "disagree-key": "Disagree"
      }

      $(".frequency").html("In the past <strong>" + habit.condition + "</strong>, " +
         charName.name  + " " + habit.past + " <em>3 times</em>.");
      // $(".frequency").html("Suppose: " + charName.name  + " " + habit.habitual + " <em>" + _.values(freq)[0] + "</em>.");

      $(".habitual").html('"' + charName.name  + ' ' + habit.habitual + '."');

      _.mapObject(exp.judgeButtons, function(val,key){
        $("#"+val+"key-reminder").html(keyDictionary[key]);
      });

      $(document).one("keydown", _s.keyPressHandler);
    },

    keyPressHandler : function(event) {
      var keyCode = event.which;
      if (keyCode != 81 && keyCode != 80) {
        // If a key that we don't care about is pressed, re-attach the handler (see the end of this script for more info)
        $(document).one("keydown", _s.keyPressHandler);
      } else {
        // If a valid key is pressed (code 80 is p, 81 is q),
          _s.rt = Date.now() - _s.startTime;
          _s.log_responses(keyCode);
          /* use _stream.apply(this); if and only if there is
          "present" data. (and only *after* responses are logged) */
         setTimeout(function(){_stream.apply(_s)}, 250);
      }

    },

    log_responses : function(keyCode) {
      var response = _.invert(exp.judgeButtons)[exp.buttonCodes[keyCode]]
      var stimDetails = _s.stim;
      var name = stimDetails[1].name;
      var habit = stimDetails[0].habitual;
      var freqLevel = stimDetails[0].condition;
      var nInstances = 3//stimDetails[0][freqLevel].past.instances
      var evidenceStatement = stimDetails[0].past
      var category = stimDetails[0].category
      exp.data_trials.push({
        "trial_type" : "truthJudge",
        "habitual":habit,
        "freqLevel": "NA",
        "n_instances": nInstances,
        "time_period": freqLevel,
        "evidenceStatement": evidenceStatement,
        "characterName": name,
        "response" : response,
        "category":category,
        "rt":_s.rt
      });
    }
  });

  slides.check = slide({
     name : "check",
     start: function() {
      this.startTime = Date.now();
            $(".err").hide();

     },
    button : function() {
      if (!($("input:radio[name=catch]").is(":checked"))) {
        $(".err").show();
      } else {
        this.rt = Date.now() - this.startTime;
        this.log_responses();
        exp.go();
      }
    },
    log_responses : function() {
      var response = $("input:radio[name=catch]:checked").val()
      exp.catch_trials.push({
        "trial_type" : "catch",
        "response" : response,
        "pass": response == exp.judgeButtons["disagree-key"] ? 1 : 0,
        "rt":this.rt
      });
    }
  });


  slides.subj_info =  slide({
    name : "subj_info",
    submit : function(e){
      //if (e.preventDefault) e.preventDefault(); // I don't know what this means.
      exp.subj_data = {
        language : $("#language").val(),
        enjoyment : $("#enjoyment").val(),
        asses : $('input[name="assess"]:checked').val(),
        age : $("#age").val(),
        gender : $("#gender").val(),
        education : $("#education").val(),
        problems: $("#problems").val(),
        fairprice: $("#fairprice").val(),
        comments : $("#comments").val()
      };
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.thanks = slide({
    name : "thanks",
    start : function() {
      exp.data= {
          "trials" : exp.data_trials,
          "catch_trials" : exp.catch_trials,
          "system" : exp.system,
          "condition" : exp.condition,
          "subject_information" : exp.subj_data,
          "time_in_minutes" : (Date.now() - exp.startT)/60000
      };
      setTimeout(function() {turk.submit(exp.data);}, 1000);
    }
  });

  return slides;
}

/// init ///
function init() {


  exp.trials = [];
  exp.catch_trials = [];

  exp.buttonCodes = {80:"P", 81:"Q"};
  exp.judgeButtons = _.object(_.zip(["agree-key","disagree-key"],
                            _.shuffle(["P","Q"])));

  // debugger;

  var timeConditions = ["10 years","year","month","week"]

  var conditions = _.shuffle(_.flatten(_.map(timeConditions, function(c){
    return utils.fillArray(c, stimuli.length/timeConditions.length)
  })))

  var stimsUnpacked = _.shuffle(_.map(_.zip(stimuli,conditions), function(s){return _.extend(s[0], {"condition": s[1]})}))

  var charNames = _.shuffle(_.flatten([characters,characters]).slice(0, stimsUnpacked.length))

  exp.stims = _.shuffle(_.zip(stimsUnpacked, charNames))

  // debugger;
  exp.numTrials = exp.stims.length;


  exp.system = {
      Browser : BrowserDetect.browser,
      OS : BrowserDetect.OS,
      screenH: screen.height,
      screenUH: exp.height,
      screenW: screen.width,
      screenUW: exp.width
    };
  //blocks of the experiment:
   exp.structure=["i0", "instructions", "truthJudge","check",'subj_info', 'thanks'];
 
  exp.data_trials = [];
  //make corresponding slides:
  exp.slides = make_slides(exp);

  exp.nQs = utils.get_exp_length(); //this does not work if there are stacks of stims (but does work for an experiment with this structure)
                    //relies on structure and slides being defined

  $('.slide').hide(); //hide everything

  //make sure turkers have accepted HIT (or you're not in mturk)
  $("#start_button").click(function() {
    if (turk.previewMode) {
      $("#mustaccept").show();
    } else {
      $("#start_button").click(function() {$("#mustaccept").show();});
      exp.go();
    }
  });

  exp.go(); //show first slide
}