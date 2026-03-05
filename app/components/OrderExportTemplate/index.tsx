import { OrderField } from "app/config";

const OrderExportTemplate = ({
  orders,
}: {
  orders: OrderField[];
}) => { 
  return <>
    <s-section padding="none">
      <s-table>
        <s-table-header-row>
          <s-table-header>Name</s-table-header>
          <s-table-header>Export via</s-table-header>
          <s-table-header format="numeric">Schedule export</s-table-header>
          <s-table-header>Action</s-table-header>
        </s-table-header-row>
        <s-table-body>
          <s-table-row>
            <s-table-cell>John Smith</s-table-cell>
            <s-table-cell>john@example.com</s-table-cell>
            <s-table-cell>23</s-table-cell>
            <s-table-cell>123-456-7890</s-table-cell>
          </s-table-row>
          <s-table-row>
            <s-table-cell>Jane Johnson</s-table-cell>
            <s-table-cell>jane@example.com</s-table-cell>
            <s-table-cell>15</s-table-cell>
            <s-table-cell>234-567-8901</s-table-cell>
          </s-table-row>
          <s-table-row>
            <s-table-cell>Brandon Williams</s-table-cell>
            <s-table-cell>brandon@example.com</s-table-cell>
            <s-table-cell>42</s-table-cell>
            <s-table-cell>345-678-9012</s-table-cell>
          </s-table-row>
        </s-table-body>
      </s-table>
    </s-section>
  </>
}

export default OrderExportTemplate