import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get<Stock>(`stock/${productId}`);

      const product = cart.find((product) => product.id === productId);

      if (!product && responseStock.data.amount > 0) {
        const responseProducts = await api.get<Product>(
          `products/${productId}`
        );

        setCart([...cart, { ...responseProducts.data, amount: 1 }]);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...responseProducts.data, amount: 1 }])
        );
      } else if (product && product.amount <= responseStock.data.amount) {
        const amount = product.amount + 1;
        updateProductAmount({ productId, amount });
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (product) {
        const newListWithProductRemoved = cart.filter(
          (product) => product.id !== productId
        );
        setCart(newListWithProductRemoved);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newListWithProductRemoved)
        );
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const responseStock = await api.get<Stock>(`stock/${productId}`);

      if (amount < 1) {
        throw new Error();
      } else if (amount <= responseStock.data.amount) {
        const newCartList = cart.map((product) =>
          product.id === productId ? { ...product, amount } : product
        );

        setCart(newCartList);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartList));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
