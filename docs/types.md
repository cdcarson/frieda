<table>
  <thead>
    <tr>
      <th>MySQL Type</th>
      <th>Column Annotation</th>
      <th>Javascript Type</th>
      <th>Cast</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>bigint</code></td>
      <td></td>
      <td><code>string</code></td>
      <td></td>
    </tr>
    <tr>
      <td><code>bigint</code></td>
      <td><code>COMMENT '@bigint'</code></td>
      <td><code>bigint</code></td>
      <td><code>BigInt(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>tinyint(1)</code>
        <br />
        <code>bool</code>, <code>boolean</code>
      </td>
      <td></td>
      <td><code>boolean</code></td>
      <td><code>parseInt(value) !== 1</code></td>
    </tr>
    <tr>
      <td>
        <code>tinyint[(M)]</code> where M != 1
        <br />
        <code>smallint</code>
        <br />
        <code>mediumint</code>
        <br />
        <code>int</code>, <code>integer</code>
      </td>
      <td></td>
      <td><code>number</code></td>
      <td><code>parseInt(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>double</code>, <code>real</code>
        <br />
        <code>float</code>
        <br />
        <code>decimal</code>, <code>numeric</code>
      </td>
      <td></td>
      <td><code>number</code></td>
      <td><code>parseFloat(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>datetime</code>
        <br />
        <code>timestamp</code>
        <br/>
        <code>date</code>
      </td>
      <td></td>
      <td><code>Date</code></td>
      <td><code>new Date(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>year</code>
      </td>
      <td></td>
      <td><code>number</code></td>
      <td><code>parseInt(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>time</code>
      </td>
      <td></td>
      <td><code>string</code></td>
      <td></td>
    </tr>
    <tr>
      <td>
        <code>json</code>
      </td>
      <td></td>
      <td><code>any</code></td>
      <td><code>JSON.parse(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>json</code>
      </td>
      <td>
        <code>COMMENT '@json(MyType)'</code>
      </td>
      <td><code>MyType</code></td>
      <td><code>JSON.parse(value)</code></td>
    </tr>
    <tr>
      <td>
        <code>enum</code>
      </td>
      <td>
      </td>
      <td> 
        <code>'a' | 'b'</code>
        <br>
        <small>
          (where the column is defined as `enum('a','b'))
        </small>
      </td>
      <td></td>
    </tr>
  </tbody>
</table>

```ts
const foo = 8;
```
