import { bound } from "@goauthentik/elements/decorators/bound";

import { msg } from "@lit/localize";
import { PropertyValues, TemplateResult, html } from "lit";
import { customElement, property, queryAll } from "lit/decorators.js";
import { map } from "lit/directives/map.js";

import { type ISimpleTable, SimpleTable } from "./ak-simple-table";
import type { TableRow } from "./types";

export interface ISelectTable extends ISimpleTable {
    value: string;
    radio: boolean;
    valueSep: string;
    selected: string[];
}

/**
 * @element ak-select-table
 * class Table
 *
 * A simple table with sort events, and now a select column. Handles both single (checkbox) and
 * multiple (radio) behaviors.
 *
 * ## Does not handle sorting.
 *
 * ... that's _all_ this does. It is the responsibility of clients using this table to:
 *
 * - marshall their content into TemplateResults
 * - catch the 'tablesort' event and send the table a new collection of rows sorted according to
 *   the client scheme.
 *
 * ## Properties
 *
 * - @prop content (see types): The content to show. The simplest content is just `string[][]`, but
 *   see the types.
 *
 * - @prop columns (see types): The column headers for the table.  Can be just a `string[]`, but see
 *   the types.
 *
 * - @attr (string, optional): The current column to order the content by.  By convention, prefix
 *   with a `-` to indicate a reverse sort order.  (See "Does not handle sorting" above).
 *
 * - @attr multiple (boolean): If true, this table is "multi-select" and a 'select all' checkbox will
 *   be available.
 *
 * - @attr value (string): If set, will set the value of the component. For multi-select, will split
 *   on the `valueSep` (see next entry).  Get is the reverse: either the value of the component,
 *   or for multi-select, the value of the component `.join()`ed with the `valueSep`
 *
 * - @attr valueSep (string): For multi-select only, the (ideally one) characters which will separate
 *   values.
 *
 * - @prop selected (string[]): The values selected. Always an array, even for mult-select. When not
 *   multi-select, will have zero or one items only.
 *
 * ## Events
 *
 * - @fires tablesort (Custom): A table header has been clicked, requesting a sort event. See "Does
 *   not handle sorting" above.
 *
 * ## CSS Customizations
 *
 * - @part table: the `<table>` element
 * - @part column-header: the `<thead>` element for the column headers themselves
 * - @part column-row: The `<tr>` element for the column headers
 * - @part column-item: The `<th>` element for each column header
 * - @part column-text: The text `<span>` of the column header
 * - @part column-sort: The sort indicator `<span>` of a column header, if activated
 * - @part group-header: The `<thead>` element for a group header
 * - @part group-row: The `<tr>` element for a group header
 * - @part group-head: The `<th>` element for a group header
 * - @part row: The `<tr>` element for a standard row
 * - @part cell cell-{index}: The `<td>` element for a single datum. Can be accessed via the index,
 *   which is zero-indexed
 * - @part select-all-header: The `<th>` element for the select-all checkbox, when _multiple_
 * - @part select-all-input: The `<input>` element for the select-all checkbox, when _multiple_
 * - @part select-cell: The `<td>` element for a select checkbox
 * - @part select-input: The `<input> element for a select checkbox
 *
 * NOTE: The select-cell is *not* indexed. The `::part(cell-{idx})` remains indexed by zero; you
 * cannot access the select-cell via `cell-0`; that would be the first data column. This is due to a
 * limitation on the `part::` semantics.
 *
 */

@customElement("ak-select-table")
export class SelectTable extends SimpleTable {
    // WARNING: This property and `set selected` must mirror each other perfectly.
    @property({ type: String, attribute: true, reflect: true })
    public set value(value: string) {
        this._value = value;
        this._selected = value.split(this.valueSep).filter((v) => v.trim() !== "");
    }

    public get value() {
        return this._value;
    }

    private _value: string = "";

    @property({ type: Boolean, attribute: true })
    multiple = false;

    @property({ type: String, attribute: true })
    valueSep = ";";

    // WARNING: This property and `set value` must mirror each other perfectly.
    @property({ attribute: false })
    public set selected(selected: string[]) {
        this._selected = selected;
        this._value = this._selected.toSorted().join(this.valueSep);
    }

    @queryAll('input[data-ouia-component-role="select"]')
    selectCheckboxesOnPage!: HTMLInputElement[];

    public get selected() {
        return this._selected;
    }

    public get json() {
        return this._selected;
    }

    private get valuesOnPage() {
        return Array.from(this.selectCheckboxesOnPage).map((checkbox) => checkbox.value);
    }

    private get checkedValuesOnPage() {
        return Array.from(this.selectCheckboxesOnPage)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
    }

    private get selectedOnPage() {
        return this.checkedValuesOnPage.filter((value) => this._selected.includes(value));
    }

    private _selected: string[] = [];

    @bound
    onSelect(ev: InputEvent) {
        ev.stopPropagation();
        const value = (ev.target as HTMLInputElement).value;
        if (this.multiple) {
            this.selected = this.selected.includes(value)
                ? this.selected.filter((v) => v !== value)
                : [...this.selected, value];
        } else {
            this.selected = this.selected.includes(value) ? [] : [value];
        }
        this.dispatchEvent(new Event("change"));
    }

    protected ouiaTypeDeclaration() {
        this.setAttribute("data-ouia-component-type", "ak-select-table");
    }

    willUpdate(changed: PropertyValues<this>) {
        if (super.willUpdate) {
            super.willUpdate(changed);
        }
        // Ensure the value attribute in the component reflects the current value after an update
        // via onSelect() or other change to `this.selected`. Done here instead of in `updated` as
        // changes here cannot trigger an update. See:
        // https://lit.dev/docs/components/lifecycle/#willupdate
        this.setAttribute("value", this._value);
    }

    public renderCheckbox(key: string | undefined) {
        if (key === undefined) {
            return html`<td class="pf-c-table__check" role="cell"></td>`;
        }
        // The double `checked` there is not a typo. The first one ensures the input's DOM object
        // receives the state; the second ensures the input tag on the page reflects the state
        // accurately. See https://github.com/lit/lit-element/issues/601
        const checked = this.selected.includes(key);
        return html`<td part="select-cell" class="pf-c-table__check" role="cell">
            <input
                type="checkbox"
                name="${key}"
                part="select-input"
                data-ouia-component-type="checkbox"
                data-ouia-component-role="select"
                value=${key}
                ?checked=${checked}
                .checked=${checked}
                @click=${this.onSelect}
            />
        </td>`;
    }

    // Without the `bound`, Lit's `map()` will pick up the parent class's `renderRow()`.
    @bound
    public renderRow(row: TableRow) {
        return html` <tr>
            ${this.renderCheckbox(row.key)}
            ${map(row.content, (col) => html`<td role="cell">${col}</td>`)}
        </tr>`;
    }

    renderAllOnThisPageCheckbox(): TemplateResult {
        const checked =
            this.selectedOnPage.length > 0 &&
            this.selectedOnPage.length === this.valuesOnPage.length;

        const onInput = (ev: InputEvent) => {
            this.selected = (ev.target as HTMLInputElement).checked ? this.valuesOnPage : [];
        };

        return html`<th part="select-all-header" class="pf-c-table__check" role="cell">
            <input
                part="select-all-input"
                name="select-all-input"
                type="checkbox"
                aria-label=${msg("Select all rows")}
                .checked=${checked}
                @input=${onInput}
            />
        </th>`;
    }

    public renderColumnHeaders() {
        return html`<tr part="column-row" role="row">
            ${this.multiple ? this.renderAllOnThisPageCheckbox() : html`<th></th>`}
            ${map(this.icolumns, (col) => col.render(this.order))}
        </tr>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-select-table": SelectTable;
    }
}
