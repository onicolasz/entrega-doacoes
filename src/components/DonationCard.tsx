import { UserContext } from "@/app/contexts/user.context";
import { useContext } from "react";

type Item = {
  name: string;
  quantity: number;
  weigth: number;
};

type CardProps = {
  userName: string;
  items: Item[];
  fromLocation: string;
  destinationLocation: string;
};

const DonationCard: React.FC<CardProps> = ({
  userName,
  items,
  fromLocation,
  destinationLocation,
}) => {
  const { user } = useContext(UserContext);
  const firstItem = items[0];
  const additionalItems = items.length - 1;

  const { totalQuantity, totalWeight } = items.reduce((acc, currentItem) => {
    return {
      totalQuantity: acc.totalQuantity + currentItem.quantity,
      totalWeight: acc.totalWeight + currentItem.weigth,
    };
  }, { totalQuantity: 0, totalWeight: 0 });

  return (
    <div className="flex p-4 mb-4 bg-white text-black text-sm rounded-2xl items-center m-4">
      <div className="flex-1">
        <div className="flex items-center mb-2">
          <div className="rounded-2xl p-2 bg-gray-200 font-medium flex items-center justify-center text-xs mr-2">
            {userName}
          </div>
          <div>
            {firstItem.quantity}{" "}
            {firstItem.quantity > 1 ? "unidades" : "unidade"} de{" "}
            {firstItem.name} e
            {additionalItems > 0 && (
              <span className="ml-1 bg-slate-200 rounded-full p-1">
                +{additionalItems} {additionalItems > 1 ? "itens" : "item"}
              </span>
            )}
          </div>
        </div>
        <div>
          <div>
            <strong>Origem: </strong> {fromLocation}
          </div>
          <div>
            <strong>Destino: </strong> {destinationLocation}
          </div>
        </div>
      </div>
      <div className="flex-2 ml-4">
        <p className="text-lg font-semibold">Total de itens {totalQuantity}</p>
        <p>Peso total {totalQuantity}kg</p>
        <p>Distância 2km</p>
      </div>
      {!!user?.transporter_id && (
        <div className="flex-2 ml-4">
          <button className="bg-green-700 text-white rounded-xl p-2 border border-slate-200 hover:bg-green-500 active:bg-green-700 duration-100">Aceitar entrega</button>
        </div>
      )}
    </div>
  );
};

export default DonationCard;
