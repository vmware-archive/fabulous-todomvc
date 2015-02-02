var fab = require('fabulous');
var Sync = require('fabulous/data/Sync');
var Observer = require('fabulous/data/Observer');
var LocalStorage = require('fabulous/data/LocalStorage');
var Scheduler = require('fabulous/data/Scheduler');
var fn = require('fabulous/lib/fn');
var lens = require('fabulous/lib/lens');

var csst = require('csst');

exports.main = fab.run(document.getElementById('todoapp'), todosApp);

function todosApp(node, context) {
	var counter = 1;

	context.todos = [];
	context.remaining = 0;
	context.completed = 0;
	context.allCompleted = false;

	window.localStorage.removeItem('fabulous-todos');
	setTimeout(function() {
		for(var i=0; i<1000; ++i) {
			context.add({ description: 'todo ' + i });
		}
	}, 100);

	// Not crazy about using `this` here to refer to the context
	// These could be methods on a controller object in another module
	context.add = function(todo) {
		this.todos.push({
			id: '' + Date.now() + (counter++),
			description: todo.description,
			complete: false
		});
	};

	context.remove = function(todo) {
		this.todos = this.todos.filter(function(t) {
			return t.id !== todo.id;
		});
	};

	context.clearCompleted = function() {
		this.todos = this.todos.filter(function(todo) {
			return !todo.complete;
		});
	};

	context.toggleAll = function(value, e) {
		this.todos.forEach(function(todo) {
			todo.complete = e.target.checked;
		});
	};

	context.beginEdit = function(todo, e, node) {
		node.classList.add('editing');
	};

	context.endEdit = function(description, e, node) {
		node.classList.remove('editing');
	};

	var updateClasses = createCardinalityClassUpdater(node);

	updateClasses(context);

	// TODO: Needs to be easier and more obvious
	var syncTodos = new Sync([
		new LocalStorage('fabulous-todos'),
		Observer.fromProperty('todos', context)
	], 100);

	syncTodos.onChange = fn.compose(updateClasses, updateStats(context));

	// TODO: Shouldn't need to do this?  Make this easier
	syncTodos.run(context.scheduler);

	// TODO: Shouldn't need to do this?  Make this easier
	context.navigation.forEach(function(state) {
		node.classList.toggle(state.value, state.action > 0);
	});
}

var updateStats = fn.curry(function updateStats(context, todos) {
	var remaining = fn.reduce(function(remaining, todo) {
		return todo.complete ? remaining : remaining + 1;
	}, 0, todos);

	context.remaining = remaining;
	context.completed = todos.length - remaining;
	context.allCompleted = remaining === 0 && todos.length > 0;
	return context;
});

function createCardinalityClassUpdater (node) {
	// TODO: Simplify csst
	// TODO: Find declarative shortcuts for some of this
	var todos = csst.flip(csst.lift(csst.cardinality('todos')))(node);
	var completed = csst.flip(csst.lift(csst.cardinality('todos-completed')))(node);
	var remaining = csst.flip(csst.lift(csst.cardinality('todos-remaining')))(node);

	var updates = [
		fn.compose(todos, lens.propertyPath('todos.length')),
		fn.compose(completed, lens.property('completed')),
		fn.compose(remaining, lens.property('remaining'))
	];

	return function(context) {
		fn.map(fn.apply(context), updates);
//		updates.forEach(fn.apply(context));
	};
}

//
//function registerAllComponents(document) {
//	var templates = document.querySelectorAll('template[type="fabulous"]');
//	return fn.reduce(function(document, template) {
//		return createCustomElement(document, fromTemplate(template), template.id, template.getAttribute('extends'));
//	}, document, templates);
//}
//
//function fromTemplate(template) {
//	return document.importNode(template.content, true);
//}
//
//function createCustomElement(document, contentNode, name, parent) {
//	var proto = Object.create(HTMLElement.prototype, {
//		createdCallback: { value: function() {
//			this.createShadowRoot().appendChild(contentNode);
//		},
//		extends: { value: parent }
//		}
//	});
//
//	document.registerElement(name, {prototype: proto});
//	return document;
//}
