/**
 * @author MarioDu <dujiakun@gmail.com>
 */

module.exports = new (function() {

    var db, Counter, mongoose, counterName;

    this.plugin = function(schema, options) {

        if (!options.model)
            throw new Error('Missing required parameter: model');

        options.model = options.model.toLowerCase() + 'unikey';
        options.field = options.field || 'unikey';
        //don't use _id, keep it
        options.start = (!isNaN(options.start)) ? options.start : 1;
        options.step = (!isNaN(options.step)) ? options.step : 1;

        var fields = {},
            ready = false;

        // Adding new field into schema
        fields[options.field] = {
            type: String,
        };

        if (options.field != '_id') {
            fields[options.field].unique = true;
            fields[options.field].require = true;
        }

        schema.add(fields);

        // Initializing of plugin
        Counter.findOne({
            model: options.model,
            field: options.field
        }, function(err, res) {
            if (!res)
                (new Counter({
                    model: options.model,
                    field: options.field,
                    seq: options.start
                })).save(function() {
                        ready = true;
                    });
            else
                ready = true;
        });

        schema.pre('save', function(next) {

            var doc = this;

            if (typeof doc[options.field] != 'undefined') return next();
            // Increment method refer to http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/,
            // first method
            function save() {

                if (ready)
                    Counter.collection.findAndModify({
                        model: options.model,
                        field: options.field
                    }, [], {
                        $inc: {
                            seq: options.step
                        }
                    }, {
                        'new': true
                    }, function(err, res) {

                        if (!err)
                            doc[options.field] = (res.seq).toString(36);
                        next(err);
                    });
                else
                    setTimeout(save, 5);
                // Delay before plugin will be sucessfully initialized
            }

            save();
        });
    };

    this.init = function(database, counter) {

        db = database;
        mongoose = require('mongoose');
        counterName = counter || 'counter';

        var schema = new mongoose.Schema({
            model: {
                type: String,
                require: true
            },
            field: {
                type: String,
                require: true
            },
            seq: {
                type: Number,
                default: 1
            }
        });
        schema.index({ field: 1, model: 1 }, { unique: true, required: true, index: -1 });

        Counter = mongoose.model(counterName, schema);
    };

})();
