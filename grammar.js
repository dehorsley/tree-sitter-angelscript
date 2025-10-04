
const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  OFFSETOF: 8,
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  CAST: 12,
  SIZEOF: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  SUBSCRIPT: 17,
};

module.exports = grammar({
  name: 'angelscript',

  word: $ => $.identifier,

  conflicts: $ =>
    [
      [$.datatype, $.variable_access],
      [$.datatype, $.scope, $.variable_access],
      [$.datatype, $.scope,],
      [$.scope, $.variable_access],
      [$.func, $.variable_access],
    ],

  extras: $ => [
    $.comment,
    /\s|\\\r?\n/,
  ],

  rules: {
    // script: $ => 'hello',
    script: $ =>
      seq(
        repeat1(
          choice(
            // import_,
            // enum_,
            // $.typdef,
            // class_,
            // mixin_,
            // interface_,
            // funcdef,
            // virtprop,
            // var_,
            $.func,
            // namespace,
            $._block_item,
            ';')),
      ),

    typdef: $ => seq(
      'typedef',
      field('type', $.primative_type),
      field('declarator', $.identifier),
      ';'
    ),

    // func: $ => seq(
    //   field('type', seq($.type, optional('&'))),
    //   field('name', $.identifier),
    //   field('parameters', $.parameter_list),
    //   choice(';', field('body', $.block))
    // ),


    func: $ => seq(
      field('specifier', seq(
        optional($.func_location),
        optional($.access_specifier)
      )),
      field('type',
        optional(
          choice(
            seq($.type, optional('&')),
            '~',
          ))),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      field('const', optional('const')),
      field('attr', optional($.funcattr)),
      choice(';', field('body', $.compound_statement))
    ),

    //  IDENTIFIER paramlist 'const'? FUNCATTR? (';' | statblock)
    func_location: $ => repeat1(choice('shared', 'external')),
    access_specifier: $ => choice('private', 'protected'),

    parameter_list: $ => seq(
      '(',
      optional(
        choice(
          'void',
          seq(
            commaSep($.parameter_declaration),
            optional(',')
          ))),
      ')'
    ),

    parameter_declaration: $ =>
      seq(
        $._declaration_specifier,
        field('name', $.identifier),
        optional(
          seq('=', field('default', $._expression))
        )
      ),

    _declaration_specifier: $ =>
      seq(
        field('type', $.type),
        field('type_modifier', optional($.typemod)),
      ),

    typemod: $ => seq('&', optional(choice('in', 'out', 'inout'))),

    type: $ => seq(
      optional('const'),
      optional($.scope),
      $.datatype,
      repeat($.type_parameter),
      repeat(
        choice(
          seq('[', ']'),
          seq('@', optional('const')),
        )
      )
    ),

    datatype: $ => choice($.identifier, $.primative_type, '?', 'auto'),

    scope: $ =>
      prec.right(seq(
        optional(seq($.identifier, repeat(seq('::', $.identifier)))),
        optional($.type_parameter),
        '::'
      )),


    type_parameter: $ => seq('<', commaSep1($.type), '>'),


    variable_definition: $ =>
      seq(
        optional($.access_specifier),
        $.type,
        commaSep1(seq($.identifier,
          optional(
            choice(
              seq('=', choice($.initlist, $._expression)),
              $._argument_list)
          )
        )),
        ';'
      ),


    initlist: $ => seq(
      '{',
      commaSep(choice($._expression, $.initlist)),
      '}'
    ),

    _argument_list: $ => prec(PREC.CALL, seq(
      '(',
      commaSep($.argument),
      ')'
    )),

    argument: $ => seq(
      optional(seq(field('name', $.identifier), ':')),
      field('value', $._expression)
    ),


    compound_statement: $ => seq(
      '{',
      repeat($._block_item),
      '}',
    ),

    _block_item: $ => choice(
      $.variable_definition,
      $._statement,
    ),

    _statement: $ => choice(
      $.case_statement,
      $._non_case_statement,
    ),

    _non_case_statement: $ => choice(
      $.compound_statement,
      $.expression_statement,
      $.if_statement,
      $.switch_statement,
      $.do_statement,
      $.while_statement,
      $.for_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
    ),

    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),
    expression_statement: $ => seq($._expression, ';'),
    return_statement: $ => seq('return', optional($._expression), ';'),

    if_statement: $ => prec.right(seq(
      'if',
      field('condition', $.parenthesized_expression),
      field('consequence', $._statement),
      optional(field('alternative', $.else_clause)),
    )),

    else_clause: $ => seq('else', $._statement),

    switch_statement: $ => seq(
      'switch',
      field('condition', $.parenthesized_expression),
      field('body', $.compound_statement),
    ),

    case_statement: $ => prec.right(seq(
      choice(
        seq('case', field('value', $._expression)),
        'default',
      ),
      ':',
      repeat(choice(
        $._non_case_statement,
        $.variable_definition,
      )),
    )),

    while_statement: $ => seq(
      'while',
      field('condition', $.parenthesized_expression),
      field('body', $._statement),
    ),

    do_statement: $ => seq(
      'do',
      field('body', $._statement),
      'while',
      field('condition', $.parenthesized_expression),
      ';',
    ),

    for_statement: $ => seq(
      'for',
      '(',
      $._for_statement_body,
      ')',
      field('body', $._statement),
    ),
    _for_statement_body: $ => seq(
      choice(
        field('initializer', $.variable_definition),
        seq(field('initializer', optional(choice($._expression, $.comma_expression))), ';'),
      ),
      field('condition', optional(choice($._expression, $.comma_expression))),
      ';',
      field('update', optional(choice($._expression, $.comma_expression))),
    ),

    parenthesized_expression: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    identifier: _ => /[_\p{XID_Start}][_\p{XID_Continue}]*/,


    primative_type: $ =>
      choice(
        'void',
        'int',
        'int8',
        'int16',
        'int32',
        'int64',
        'uint',
        'uint8',
        'uint16',
        'uint32',
        'uint64',
        'float',
        'double',
        'bool',
      ),
    funcattr: $ =>
      choice(
        'override',
        'final',
        'explicit',
        'property'
      ),



    // Expressions

    _expression: $ => choice(
      $._expression_not_binary,
      $.binary_expression,
    ),

    _expression_not_binary: $ => choice(
      $.conditional_expression,
      $.assignment_expression,
      $.unary_expression,
      $.update_expression,
      $.cast_expression,
      $.subscript_expression,
      $.call_expression,
      $.field_expression,
      $.variable_access,
      $.number_literal,
      $.string_literal,
      $.true,
      $.false,
      $.null,
      $.parenthesized_expression,
    ),

    variable_access: $ => seq(
      field('scope', optional($.scope)),
      $.identifier,
    ),

    comma_expression: $ => seq(
      field('left', $._expression),
      ',',
      field('right', choice($._expression, $.comma_expression)),
    ),

    conditional_expression: $ => prec.right(PREC.CONDITIONAL, seq(
      field('condition', $._expression),
      '?',
      optional(field('consequence', $._expression)),
      ':',
      field('alternative', $._expression),
    )),

    string_literal: $ => choice(
      $._double_quote_string,
      $._single_quote_string,
      $._multiline_string,
    ),

    _double_quote_string: $ =>
      seq(
        '"',
        repeat(choice(
          alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_content),
          $.escape_sequence,
        )),
        '"',
      ),

    _single_quote_string: $ =>
      seq(
        "'",
        repeat(choice(
          alias(token.immediate(prec(1, /[^\\'\n]+/)), $.string_content),
          $.escape_sequence,
        )),
        "'",
      ),

    escape_sequence: _ => token(prec(1, seq(
      '\\',
      choice(
        /[^xuU]/,
        /\d{2,3}/,
        /x[0-9a-fA-F]{2,}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/,
      ),
    ))),

    // TODO check
    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      field('left', $._expression),
      field('operator', choice(
        '=',
        '*=',
        '**=',
        '/=',
        '%=',
        '+=',
        '-=',
        '<<=',
        '>>=',
        '>>>=',
        '&=',
        '^=',
        '|=',
      )),
      field('right', $._expression),
    )),

    // TODO check
    unary_expression: $ => prec.left(PREC.UNARY, seq(
      field('operator', choice('@', 'not', '!', '~', '-', '+')),
      field('argument', $._expression),
    )),

    // TODO check
    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['**', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['or', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['and', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['^', PREC.EXCLUSIVE_OR],
        ['xor', PREC.EXCLUSIVE_OR],
        ['&', PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['is', PREC.RELATIONAL],
        ['!is', PREC.RELATIONAL],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
        ['>>>', PREC.SHIFT],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $._expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $._expression),
        ));
      }));
    },

    update_expression: $ => {
      const argument = field('argument', $._expression);
      const operator = field('operator', choice('--', '++'));
      return prec.right(PREC.UNARY, choice(
        seq(operator, argument),
        seq(argument, operator),
      ));
    },

    // TODO fix
    cast_expression: $ => prec(PREC.CAST, choice(
      seq(
        '(',
        field('type', $.type),
        ')',
        field('value', $._expression)
      ),
      seq(
        field('type', $.primative_type),
        '(',
        field('value', $._expression),
        ')'
      )
    )),

    subscript_expression: $ => prec(PREC.SUBSCRIPT, seq(
      field('argument', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),
    call_expression: $ => prec(PREC.CALL, seq(
      field('function', alias($._expression, $.reciever)),
      field('arguments', $._argument_list),
    )),

    field_expression: $ => seq(
      prec(PREC.FIELD, seq(
        field('argument', $._expression),
        field('operator', '.',),
      )),
      field('field', $._field_identifier),
    ),
    _field_identifier: $ => alias($.identifier, $.field_identifier),

    true: _ => token(choice('TRUE', 'true')),
    false: _ => token(choice('FALSE', 'false')),
    null: _ => choice('NULL', 'nullptr'),

    number_literal: _ => {
      const separator = '\'';
      const hex = /[0-9a-fA-F]/;
      const decimal = /[0-9]/;
      const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
      const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));
      return token(seq(
        optional(/[-\+]/),
        optional(choice(/0[xX]/, /0[bB]/)),
        choice(
          seq(
            choice(
              decimalDigits,
              seq(/0[bB]/, decimalDigits),
              seq(/0[xX]/, hexDigits),
            ),
            optional(seq('.', optional(hexDigits))),
          ),
          seq('.', decimalDigits),
        ),
        optional(seq(
          /[eEpP]/,
          optional(seq(
            optional(/[-\+]/),
            hexDigits,
          )),
        )),
        /[uUlLwWfFbBdD]*/,
      ));
    },


    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: $ => token(choice(
      seq('//', /.*/),
      seq('#', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      )
    )),

    _multiline_string: $ =>
      seq(
        '"""',
        repeat(choice(
          alias(token.immediate(prec(1, /([^\\"]|[^"][^"][^"])+/)), $.string_content),
          $.escape_sequence,
        )),
        '"""',
      ),
  },

});


function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}

function commaSep(rule) {
  return optional(commaSep1(rule))
}
